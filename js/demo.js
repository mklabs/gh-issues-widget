(function() {
  $(function() {

    var el = $('[data-repo]'),
      issue = el.data('issue');

    var form = $('form').bind('submit', function(e) {
      e.preventDefault();
      var repo = form.find('input[name=repo]').val(),
        id = form.find('input[name=identifer]').val();

      if(!repo) return;

      issue.repo = repo;
      issue.identifier = id || '.';

      issue.fetch();
      window.test = issue;
    });

    $(window).bind('error', function(e) {
      el.html(e.originalEvent.message);
    });
  });
})();
