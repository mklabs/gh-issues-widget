(function($, exports) {

  var defaultTemplate = [
    '<p class="comment-count"><%= num %></p>',
    '<ul>',
    '  <% _.each(issues, function(issue) { %>',
    '  <li class="comment-first">',
    '    <span class="avatar">',
    '      <img src="<%= issue.issue.user.avatar_url %>" />',
    '      <p class="author"><a href="https://github.com/<%= issue.issue.user.login %>">@<%= issue.issue.user.login %></a></p>',
    '    </span>',
    '    <div class="comment-body"><%= ghm(issue.issue.body, repo) %></div>',
    '  </li>',
    '  <li class="gh-issues-thread">',
    '    <ul>',
    '   <% _.each(issue.comments.data, function(comment) { %>',
    '     <li>',
    '       <span class="avatar">',
    '         <img src="<%= comment.user.avatar_url %>" />',
    '         <p class="author"><a href="https://github.com/<%= comment.user.login %>">@<%= comment.user.login %></a></p>',
    '       </span>',
    '       <div class="comment-body"><%= ghm(comment.body, repo) %></div>',
    '     </li>',
    '   <% }); %>',
    '   </ul>',
    ' </li>',
    ' <% }); %>',
    '</ul>'
  ].join('');


  // required:
  //
  // $(el), $.getJSON ( jsonp ), $.fn.html, $.data, $.ready
  // _.template, _.extend, _.bind

  var converter = (function() {
    var parser = typeof Showdown !== 'undefined' ? new Showdown.converter() : {
      makeHtml: function(str, repo) {
        return str;
      }
    };

    return {
      parse: function(str, repo) {
        return parser.makeHtml(str, repo);
      }
    }
  })();


  var Issues = function Issues(el, o) {
    o = o || {};
    if(!o.repo) throw new Error('Required o.repo missing');
    this.$el = $(el);
    this.el = el;

    this.repo = o.repo;
    this.id = o.identifier || o.id || this.slug(location.pathname);
    this.template = typeof o.template === 'function' ? o.template :
      _.template(o.template && $(o.template).length ? $(o.template).html() : defaultTemplate);

    this.ghm = o.converter || converter;
    this.ghm = _.bind(this.ghm.parse, this);

    this.fetch();
  };

  _.extend(Issues.prototype, {
    API: 'https://api.github.com',

    PATH_ERROR: 'Cannot determine the slug for root path, you must provide an identifier in that case.',

    labels: {
      comments: 'comment'
    },


    // Return the "slug" for the current page, in case
    // there are no specific identifiers provided.
    slug: function(path) {
      if(path === '/') throw new Error(this.PATH_ERROR);
      return path.replace(/\/$/, '').split('/').slice(-1);
    },

    request: function request(uri, data) {
      return $.getJSON(this.API + uri.replace(/:([a-z]+)/g, function(w, m) {
        return data[m] || w;
      }));
    },

    spinner: function() {
      this.$el.empty().append($('<span />', { 'class': 'spinner' }));
      return this;
    },

    fetch: function() {
      this.spinner();
      this.request('/repos/:repo/issues?callback=?', { repo: this.repo })
        .success(_.bind(this.handle, this))
        .error(_.bind(this.error, this));

      return this;
    },

    handle: function handle(res) {
      if(res.data.message) return this.error(new Error(res.data.message));
      if(!res.data.length) return;

      var self = this,
        comments = [],
        reg = new RegExp(this.id),
        related = res.data.filter(function(issue) {
          return reg.test(issue.title);
        }),
        ln = related.length;

      if(!ln) return this.render();

      related.forEach(function(rel) {
        var req = self.request('/repos/:repo/issues/:num/comments?callback=?', {
          repo: self.repo,
          num: rel.number
        });

        req.success(function(data) {
          comments.push({
            issue: rel,
            comments: data
          });

          next(null, comments);
        });

        req.error(_.bind(self.error, self));
      });

      function next(err, model) {
        ln--;
        if(err) return self.error(err);
        if(!ln) self.render(model);
      }

      return this;
    },

    render: function render(model) {
      model = model || [];
      var num = model.map(function(issue) {
        return issue.comments.data.length + 1;
      }).reduce(function(a, b) {
        return a + b;
      }, 0);

      console.log(model);
      num = num + ' :comments' + (num > 1 ? 's' : '');
      num = num.replace(':comments', this.labels.comments);

      this.$el.html(this.template({ issues: model, ghm: this.ghm, num: num, repo: this.repo }));
      return this;

    },

    error: function error(e) {
      if(e instanceof Error) throw e;
      console.error.apply(console, arguments);
      return this;
    }
  });


  $.fn.issues = function issues() {
    if(!this.length) return;

    return this.each(function() {
      var el = $(this),
        data = el.data();

      el.data('issue', new Issues(el, data));
    });
  };

  $(function() {
    $('[data-repo]').issues();
  });


})(this.jQuery, this);
