var ConsoleView = Backbone.View.extend(
{
    initialize: function(o) {

      this.listenTo(channel, 'machine.response', function(r,s) {
          if (navView.activeView == 'console') {
            var c = $('.console-out');
            c.append('<div class="line">'+s+'</div>');
            c.scrollTop(c.prop("scrollHeight"));
          }
      })
    },

    events: {
      'keyup input.console-in': 'keypress'
    },

    keypress: function(e)
    {
       if (e.keyCode == 13) {
           this.runCommand();
       }
    },

    runCommand: function()
    {
        var cmd = $('input.console-in').val();
        if (cmd != "") {
            machine.execute(cmd)
            $('div.console-out').append('<div class="line">'+cmd+'</div>');
        }
        $('input.console-in').val('');
    },


    render: function()
    {
        return this.$el;
    }
});
