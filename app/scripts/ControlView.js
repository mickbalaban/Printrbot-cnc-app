var ControlView = Backbone.View.extend(
{
    initialize: function(o) {

    },

    events: {
      'click button.motors-off': 'motorsOff',
      'click button.clear-alarm': 'clearAlarm',
      'click button.stop-and-flush': 'stopAndFlush'
    },

    motorsOff: function(e)
    {
      machine.execute('{"md":n}');
    },

    clearAlarm: function(e)
    {
      machine.execute('{"clear":n}');
    },

    stopAndFlush: function(e)
    {
      machine.execute('!\n%\n~');
    },


    render: function()
    {
        return this.$el;
    }
});
