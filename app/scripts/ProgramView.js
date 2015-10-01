var ProgramView = Backbone.View.extend(
{
    initialize: function(o) {
      var that = this;
      this.program = "";
      this.programLength = 0;
      this.running = false;

      machine.data.on('change:stat', function(c) {
        if ((c.attributes.stat == 4 || c.attributes.stat == 3) && that.running)
            that.onProgramCompleted();

        else if (c.attributes.stat == 6) {
          $('button.program-pause').addClass('active');
          $('button.program-pause span').html('Continue');
        }
        else if (c.attributes.stat == 5) {
          $('button.program-pause').removeClass('active');
          $('button.program-pause span').html('Pause');
        }
      })

      machine.data.on('change:line', function(c) {
        var _p = Math.round(c.attributes.line / (that.programLength / 100)) + "%";
        $('.program-progress .progress-bar').css('width', _p).html(_p)
      });
    },

    events: {
      'click button.program-start': 'programStart',
      'click button.program-stop': 'programStop',
      'click button.program-load': 'programLoad',
      'click button.program-edit': 'showProgramEdit',
      'click button.program-edit-cancel': 'cancelProgramEdit',
      'click button.program-edit-save': 'saveProgramEdit',
      'click button.program-clear': 'clearProgram',
      'click button.program-pause': 'pauseProgram'
      //'change textarea': 'updateProgramFromText'
    },


    showProgramName: function(name)
    {
        $('.program-view').addClass("loaded");
        $('.program-view .panel-title').html(name);
        $('.program-view .run-actions').show();
        channel.trigger('screen.autoresize', true);
    },

    showProgramEdit: function()
    {
      $('.program-actions .run-actions').hide();
      $('.program-actions .edit-actions').show();
      $('.program-code-block textarea').removeAttr('disabled');
      channel.trigger('screen.autoresize', true);
    },

    cancelProgramEdit: function()
    {
      $('.program-actions .run-actions').show();
      $('.program-actions .edit-actions').hide();
      $('.program-code-block textarea').attr('disabled', true);
      $('.program-code-block textarea').val(this.program);
      channel.trigger('screen.autoresize', true);
    },

    clearProgram: function()
    {
      this.program = '';
      $('.program-actions .run-actions').hide();
      $('.program-actions .edit-actions').hide();
      $('.program-view .panel-title').html('No program loaded');
      this.clearProgramName();
      channel.trigger('screen.autoresize', true);
    },

    saveProgramEdit: function()
    {
      this.program = $('.program-code-block textarea').val().trim();
      $('.program-actions .run-actions').show();
      $('.program-actions .edit-actions').hide();
      $('.program-code-block textarea').attr('disabled', true);
      channel.trigger('screen.autoresize', true);
    },

    clearProgramName: function()
    {
      $('.program-view').removeClass("loaded");
      $('.program-view .alert').show();
      channel.trigger('screen.autoresize', true);
    },

    pauseProgram: function()
    {
      if (machine.data.attributes.stat == 6) {
        machine.execute('~');
        return;
      }

      if (this.running)
        machine.execute("!");
    },

    processCode: function(code)
    {

      this.program = code.trim();
      $('.program-code-block textarea').val(code);
      //console.info(code);
    },

    onProgramCompleted: function()
    {
      this.running = false;
      $('.program-view').removeClass('running');
      channel.trigger('screen.autoresize', true);
    },

    programStart: function(e)
    {
      this.running = true;
      $('.program-progress .progress-bar').css('width', 0).html('0%')
      // flush the machine buffer
      machine.execute('%');

      $('.program-view').addClass('running');
      channel.trigger('screen.autoresize', true);

      var _q = this.program.split("\n");
      this.programLength = _q.length;
      _.each(_q, function(l,k) {
        _q[k] = "N"+k+l;
      })
      machine.serialQueue = _q;
      machine.sendNextLine();

    },

    programLoad: function(e)
    {
        chrome.fileSystem.chooseEntry(function (entry) {

          if (chrome.runtime.lastError) {
            console.info(chrome.runtime.lastError.message);
            return;
          }

          entry.file(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
              programView.processCode(e.target.result);
              programView.showProgramName(entry.name);
            };
            reader.readAsText(file);
            //replaceDocContentsFromFileEntry();

          });
        });
    },


    render: function()
    {
        return this.$el;
    }
});
