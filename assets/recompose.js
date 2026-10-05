$(() => { // jQuery onReady callback

  // Define global App CDM
  Core.instance().config();
  CDM = {};
  // CDM.cookieid = `CORESID-${Core.configuration.get('env')}__${Core.configuration.get('app')}`; 
  CDM.options = {};
  CDM.references = new Map();
  // CDM.collab = true;

  // initialize App
  let app = App.instance();
});

// short hand for logger class
// so to log something, one could simply use:
// L.log('action', data);
class L {
  static log(action, data, extra, options) {
    try {
      for(let [k,v] of extra) { // console.log(k, v);
        if (v == null || v == "undefined") extra.delete(k);
      }
    } catch (err) {}

    // Execute log to server
    Logger.log(action, data, extra, options);
  }
  static dataMap(kid, cmid, room = null) {
    let map = new Map([["kid", kid],["cmid", cmid], ["room", room]]);
    if (!kid) map.delete(kid);
    if (!cmid) map.delete(cmid);
    if (!room) map.delete(room);
    return map;
  }
  static canvas(dataMap, appCanvas) {
    // Remove attribute of image binary data 
    let attrs = ['image', 'bug'];
    let canvas = appCanvas.cy.elements().jsons(); // console.log(canvas);
    for(let el of canvas) {
      for (let attr of attrs) { // console.log(el, el.data[attr])
        if (el.data.image) delete el.data[attr];
      }
    }
    // console.log(canvas);
    dataMap.set('canvas', Core.compress(canvas));
    return dataMap;
  }
  static compare(dataMap, appCanvas, conceptMap) {
    let learnerMapData = KitBuildUI.buildConceptMapData(appCanvas);
    learnerMapData.conceptMap = conceptMap;
    // console.log(learnerMapData);
    Analyzer.composePropositions(learnerMapData);

    if (!conceptMap) {
      console.warn("Compare:", "Invalid conceptMap."); 
      return;
    }
    if (!CDM.conceptMap?.map) {
      console.warn("Compare:", "Invalid conceptMap CDM.");
      return;
    }

    let direction = CDM.conceptMap.map.direction;
    let compare = Analyzer.compare(learnerMapData, direction);
    // console.warn(compare);
    dataMap.set('compare', JSON.stringify(compare));
    dataMap.set('nmatch', compare.match.length);
    dataMap.set('nmiss', compare.miss.length);
    dataMap.set('nexcess', compare.excess.length);
    return dataMap; 
  }
}

class App {
  constructor() {
    this.kbui = KitBuildUI.instance(App.canvasId);
    let canvas = this.kbui.canvases.get(App.canvasId);
    canvas.addToolbarTool(KitBuildToolbar.NODE_CREATE, { priority: 2, visible: false }); // handle concept map type
    canvas.addToolbarTool(KitBuildToolbar.UNDO_REDO, { priority: 3 });
    canvas.addToolbarTool(KitBuildToolbar.CAMERA, { priority: 4 });
    canvas.addToolbarTool(KitBuildToolbar.UTILITY, {
      priority: 5,
      trash: false,
    });
    canvas.addToolbarTool(KitBuildToolbar.LAYOUT, {priority: 6}); //{ stack: "right" }
    canvas.toolbar.render();

    // canvas.addCanvasTool(KitBuildCanvasTool.CENTROID);
    // canvas.addCanvasTool(KitBuildCanvasTool.DISTANCECOLOR);

    this.canvas = canvas;
    canvas.toolCanvas.enableLinkRemaining(false); // hide link "remaining" hint badge
    // this.session = Core.instance().session();
    // this.ajax = Core.instance().ajax();
    // this.runtime = Core.instance().runtime();
    // this.config = Core.instance().config();

    // canvas.toolCanvas.addTool("ref", new KitBuildReferenceTool(canvas, {
    //   ajax: this.ajax, 
    //   actionCallback: this
    // }));

    // Hack for sidebar-panel show/hide
    // To auto-resize the canvas.
    // AA
    // let observer = new MutationObserver((mutations) => $(`#${App.canvasId} > div`).css('width', 0))
    // observer.observe(document.querySelector('#admin-sidebar-panel'), {attributes: true})
    // Enable tooltip
    $('[data-bs-toggle="tooltip"]').tooltip({ html: true });

    // Browser lifecycle event
    // KitBuildUI.addLifeCycleListener(App.onBrowserStateChange);

    // Logger
    // if (typeof Logger != "undefined") {
      // let url = Core.instance().config().get('baseurl')
      // let sessid = Core.instance().config().get("sessid");
      // let seq = Core.instance().config().get("seq");
      // window.history.replaceState({}, document.title, url);
      // this.logger = KitBuildLogger.instance(
      //   null,
      //   seq ?? 0,
      //   sessid,
      //   canvas,
      //   null
      // ).enable();
      // if (this.logger.seq != 0) this.seq = seq;
      // App.loggerListener = this.logger.onCanvasEvent.bind(this.logger);
      // L.log = this.logger.log.bind(this.logger);
      // L.log(`init-${this.constructor.name}`);
      // canvas.on("event", App.eventListener);
    // }


    // console.log(this, typeof KitBuildLogger);

    this.handleEvent();
    this.handleRefresh().then( (sessions) => { // console.log(sessions);
    //   Core.instance().session().getId().then(async (sessid) => {
    //     sessions.id = sessid
    //     if (this.config.get('enablecollab')) {
    //       let collab = await this.startCollab(sessions);
    //       collab?.connectIfPreviouslyConnected();
    //     }
    //   });
    });

    // this.autoFeedback = AutoFeedback.instance(this.canvas);

  }

  static instance() {
    App.inst = new App();
    // App.timer = new Timer('.app-navbar .timer');
    // App.timer.on();
    // App.feedbackDelay = 10;
    return App.inst;
  }

  // setUser(user = null) {
  //   this.user = user;
  // }

  // setConceptMap(conceptMap) {
  //   console.warn("CONCEPT MAP SET:", conceptMap);
  //   this.conceptMap = conceptMap;
  //   if (conceptMap) {
  //     this.canvas.direction = conceptMap.map.direction;
  //     this.session.set("cmid", conceptMap.map.cmid);
  //     let status =
  //       `<span class="mx-2 d-flex align-items-center status-cmap">` +
  //       `<span class="badge rounded-pill bg-secondary">ID: ${conceptMap.map.cmid}</span>` +
  //       `<span class="text-secondary ms-2 text-truncate"><small>${conceptMap.map.title}</small></span>` +
  //       `</span>`;
  //     StatusBar.instance().remove(".status-cmap").prepend(status);
  //   } else {
  //     StatusBar.instance().remove(".status-cmap");
  //     this.session.unset("cmid");
  //   }
  //   $('[data-bs-toggle="tooltip"]').tooltip({ html: true });
  // }

  // setKitMap(kit = null) {
  //   console.warn("KIT MAP SET:", kit);
  //   this.kit = kit;
  //   if (kit) {
  //     this.setConceptMap(kit.conceptMap);
  //     this.session.set("kid", kit.map.kid);
  //     let tooltipText = "";
  //     tooltipText += "FBLV:" + kit.parsedOptions.feedbacklevel;
  //     tooltipText += ",FBSV:" + kit.parsedOptions.feedbacksave;
  //     tooltipText += ",FFB:" + kit.parsedOptions.fullfeedback;
  //     tooltipText += ",LOG:" + kit.parsedOptions.log;
  //     tooltipText += ",MOD:" + kit.parsedOptions.modification;
  //     tooltipText += ",RD:" + kit.parsedOptions.readcontent;
  //     tooltipText += ",RST:" + kit.parsedOptions.reset;
  //     tooltipText += ",SVLD:" + kit.parsedOptions.saveload;
  //     let status =
  //       `<span class="mx-2 d-flex align-items-center status-kit">` +
  //       `<span class="badge rounded-pill bg-primary" role="button" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltipText}">ID: ${kit.map.kid}</span>` +
  //       `<span class="text-secondary ms-2 text-truncate"><small>${kit.map.name}</small></span>` +
  //       `</span>`;
  //     KitBuild.getTextOfKit(kit.map.kid).then((text) => {
  //       this.text = text;
  //       let textLabel = text ? `Text: ${text.title}` : "Text: None";
  //       let statusText = `<span class="mx-2 d-flex align-items-center status-text">`;
  //       statusText += `<span class="badge rounded-pill bg-danger">${textLabel}</span>`;
  //       statusText += `</span>`;
  //       StatusBar.instance().remove(".status-text").append(statusText);
  //     });
  //     StatusBar.instance().remove(".status-kit").append(status);
  //   } else {
  //     this.setConceptMap();
  //     this.text = null;
  //     this.session.unset("kid");
  //     StatusBar.instance().remove(".status-kit");
  //     StatusBar.instance().remove(".status-text");
  //   }
  //   $('[data-bs-toggle="tooltip"]').tooltip({ html: true });
  // }

  // setLearnerMap(learnerMap) {
  //   console.warn("LEARNER MAP SET:", learnerMap);
  //   this.learnerMap = learnerMap;
  //   if (learnerMap) {
  //     this.session.set("lmid", learnerMap.map.lmid);
  //     let status =
  //       `<span class="mx-2 d-flex align-items-center status-learnermap">` +
  //       `<span class="badge rounded-pill bg-warning text-dark">ID: ${learnerMap.map.lmid}</span>` +
  //       `</span>`;
  //     StatusBar.instance().remove(".status-learnermap").append(status);
  //   } else {
  //     StatusBar.instance().remove(".status-learnermap");
  //     this.session.unset("lmid");
  //   }
  // }

  // openLearnerMap(kit, learnerMap = null) {
  //   let promise = new Promise((resolve, reject) => {
  //     if (!kit) {
  //       UI.errorDialog('Invalid Kit!').show();
  //       return;
  //     }
  //     this.setKitMap(kit);
  //     App.parseKitMapOptions(kit);
  //     this.logger.setConceptMap(kit.conceptMap);
  //     this.setLearnerMap(learnerMap ?? undefined);
  //     L.log("open-kit", kit.map);
  //     if (learnerMap) {
  //       L.log("continue-recompose", learnerMap.map, null, {
  //         lmid: learnerMap.map.lmid,
  //         kid: kit.map.kid,
  //         includeMapData: true,
  //       });
  //       this.logger.setLearnerMapId(learnerMap.map.lmid);
  //       learnerMap.kit = kit;
  //       learnerMap.conceptMap = kit.conceptMap;
  //       this.canvas.cy.elements().remove();
  //       this.canvas.cy.add(KitBuildUI.composeLearnerMap(learnerMap));
  //       this.canvas.applyElementStyle();
  //       this.canvas.toolbar.tools
  //         .get(KitBuildToolbar.CAMERA)
  //         .fit(null, { duration: 0 })
  //         .then(() => {
  //           App.collab(
  //             "command",
  //             "set-kit-map",
  //             kit,
  //             this.canvas.cy.elements().jsons()
  //           );
  //         });
  //       // this.setLearnerMap(learnerMap);
  //       // this.logger.setLearnerMapId(learnerMap.map.lmid);
  //       // L.log("load-learner-map", learnerMap.map, null, {
  //       //   includeMapData: true,
  //       //   lmid: learnerMap.map.lmid,
  //       // });
  //       // UI.info("Concept map loaded.").show();
  //       // confirm.hide();
  //       this.getFeedbackAndSubmitCount(learnerMap.map.author, learnerMap.map.kid, kit.parsedOptions);
  //       UI.success("Saved concept map has been loaded.").show();
  //       resolve(learnerMap);
  //     } else {
  //       this.logger.reset();
  //       L.log("begin-recompose");
  //       App.resetMapToKit(kit, this.canvas).then(() => {
  //         let cyData = this.canvas.cy.elements().jsons();
  //         App.collab("command", "set-kit-map", kit, cyData);
  //         this.saveInitialLearnerMap(kit).then((learnerMap) => {
  //           resolve(learnerMap);
  //           this.getFeedbackAndSubmitCount(learnerMap.map.author, learnerMap.map.kid, kit.parsedOptions);
  //         }, err => reject(err));
  //       });
  //     }
  //   });
  //   return promise;
  // }

  // saveInitialLearnerMap(kit) {
  //   let promise = new Promise((resolve, reject) => {
  //     let data = Object.assign(
  //       {
  //         lmid: null,
  //         kid: kit.map.kid,
  //         author: App.inst.user
  //           ? App.inst.user.username
  //           : null,
  //         type: "draft",
  //         cmid: kit.map.cmid,
  //         create_time: null,
  //         data: null,
  //       },
  //       KitBuildUI.buildConceptMapData(this.canvas)
  //     ); // console.log(data); // return
  //     this.ajax
  //       .post("kitBuildApi/saveLearnerMap", {
  //         data: Core.compress(data),
  //       })
  //       .then((learnerMap) => {
  //         // console.log(kit);
  //         this.setLearnerMap(learnerMap);
  //         this.logger.setLearnerMapId(learnerMap.map.lmid);
  //         UI.success("Concept map has been initialized.").show();
  //         L.log("learnermap-initialized", learnerMap.map, null, {
  //           lmid: learnerMap.map.lmid,
  //           includeMapData: true,
  //         });
  //         this.getFeedbackAndSubmitCount(learnerMap.map.author, learnerMap.map.kid, kit.parsedOptions);
  //         resolve(learnerMap);
  //       })
  //       .catch((error) => {
  //         UI.error(error).show();
  //         reject(error);
  //       });
  //   });
  //   return promise;
  // }

  // getFeedbackAndSubmitCount(username, kid, options = null) {
  //   $('.bt-feedback .count').html(``);
  //   $('.bt-submit .count').html(``);
  //   if (username && kid) {
  //     this.ajax.post('kitBuildApi/getFeedbackAndSubmitCount', {
  //       username: username,
  //       kid: kid
  //     }).then((count) => {
  //       if (options && options.countfb) 
  //         $('.bt-feedback .count').html(`(&times;${count.feedback})`);
  //       if (options && options.countsubmit)
  //         $('.bt-submit .count').html(`(&times;${count.submit})`);
  //     }, (err) => UI.errorDialog(err));
  //   } else {
  //     let feedbackCount = 0;
  //     let submitCount = 0;
  //     if (options && options.countfb)
  //       $('.bt-feedback .count').html(`(&times;${feedbackCount})`);
  //     if (options && options.countsubmit)
  //       $('.bt-submit .count').html(`(&times;${submitCount})`);
  //   }
  // }

  handleEvent() {


    /**
     * Concept Map reader 
     * */
    const fileInput = $('.file-input');
    const droparea = $('.file-drop-area');
    const deleteButton = $('.item-delete');
    
    fileInput.on('dragenter focus click', () => { droparea.addClass('is-active') });
    fileInput.on('dragleave blur drop', () => { droparea.removeClass('is-active') });
    fileInput.on('change', () => {
      let filesCount = $(fileInput)[0].files.length;
      let textContainer = $(fileInput).prev();
      if (filesCount >= 1) {
        let file = $(fileInput)[0].files[0];
        let reader = new FileReader();
        reader.onload = (event) => {
          let content = event.target.result;
          console.log(content);
          let data = App.parseIni(content);
          console.log(data);
          try {
            let conceptMap = Core.decompress(data.conceptMap.replaceAll('"',''));
            let kit = Core.decompress(data.kit.replaceAll('"',''));
            console.log(conceptMap, kit);
            CDM.conceptMap = conceptMap;
            CDM.kitId = fileName;
            CDM.conceptMapId = conceptMap.map.cmid;
            CDM.kit = kit;
            textContainer.html(fileNameToDisplay
              + ` <strong class="badge rounded-pill text-bg-success">File OK</strong>`
            );
          } catch(e) { console.error(e, fileName);
            textContainer.html(fileNameToDisplay
              + ` <strong class="badge rounded-pill text-bg-danger">Invalid File</strong>`
            );
            return;
          }
        };
        // console.log(file);
        reader.readAsText(file);
        let fileName = $(fileInput).val().split('\\').pop();
        let fileNameToDisplay = fileName.length > 25 ? fileName.substring(0, 25) + "..." : fileName;
        textContainer.html(`Loading ${fileNameToDisplay}...`);
        $('.item-delete').css('display', 'inline-block');
      } else if (filesCount === 0) {
        textContainer.text('or drop files here');
        $('.item-delete').css('display', 'none');
      } else { // multiple files are selected, currently ignored
        textContainer.text(filesCount + ' files selected');
        $('.item-delete').css('display', 'inline-block');
      }
    });
    deleteButton.on('click', () => {
      $('.file-input').val(null);
      $('.file-msg').text('or drop files here');
      $('.item-delete').css('display', 'none');
    });










    let openDialog = UI.modal("#concept-map-open-dialog", {
      hideElement: ".bt-cancel",
      width: "400px",
    });
    let contentDialog = UI.modal("#kit-content-dialog", {
      hideElement: ".bt-close",
      backdrop: false,
      get height() {
        return ($("body").height() * 0.7) | 0;
      },
      get offset() {
        return { left: ($("body").width() * 0.1) | 0 };
      },
      draggable: true,
      dragHandle: ".drag-handle",
      resizable: true,
      resizeHandle: ".resize-handle",
      minWidth: 375,
      minHeight: 200,
      onShow: () => {
        let sdown = new showdown.Converter({
          strikethrough: true,
          tables: true,
          simplifiedAutoLink: true,
        });
        sdown.setFlavor("github");
        console.log(contentDialog.text);
        let htmlText = contentDialog.text
          ? sdown.makeHtml(contentDialog.text.content)
          : "<em>Content text unavailable.</em>";
        $("#kit-content-dialog .content").html(htmlText);
        hljs.highlightAll();
      },
    });
    contentDialog.setContent = (text, type = "md") => {
      contentDialog.text = text;
      return contentDialog;
    };
    contentDialog.on("event", (event, data) => {
      L.log(`content-${event}`, data);
    });

    let feedbackReasonDialog = UI.modal('#feedback-reason-dialog', {
      hideElement: ".bt-close",
      width: 575,
      onShow: () => {
        $('#inputcorrect').prop('checked', false);
        $('#inputinformation').prop('checked', false);
        $('#inputunderstand').prop('checked', false);
        $('#inputotherreason').val('');
      },
    });

    this.feedbackNearbyDialog = UI.modal('#feedback-nearby-dialog', {
      hideElement: ".bt-close",
      width: 575,
      onShow: () => {
        $('#feedback-nearby-dialog .inputinformation').prop('checked', false);
        $('#feedback-nearby-dialog .inputunderstand').prop('checked', false);
        $('#feedback-nearby-dialog .inputotherreason').val('');
      },
    });

    let feedbackDialog = UI.modal("#feedback-dialog", {
      hideElement: ".bt-close",
      backdrop: false,
      draggable: true,
      dragHandle: ".drag-handle",
      width: 375,
      onShow: () => {
        $("#feedback-dialog")
          .off("click")
          .on("click", ".bt-modify", (e) => {
            $(".app-navbar .bt-clear-feedback").trigger("click");
            feedbackDialog.hide();
          });
      },
    });
    feedbackDialog.setCompare = (
      compare,
      level = Analyzer.MATCH | Analyzer.EXCESS
    ) => {
      feedbackDialog.compare = compare;
      console.log(compare, level);
      let content = "";
      if (compare.match.length && level & Analyzer.MATCH) {
        content += `<div class="d-flex align-items-center"><i class="bi bi-check-circle-fill text-success fs-1 mx-3"></i> `;
        content += `<span>You have <strong class="text-success fs-bold">${compare.match.length} matching</strong> propositions.</span></div>`;
      }
      if (compare.excess.length && level & Analyzer.EXCESS) {
        content += `<div class="d-flex align-items-center"><i class="bi bi-exclamation-triangle-fill text-primary fs-1 mx-3"></i> `;
        content += `<span>You have <strong class="text-primary fs-bold">${compare.excess.length} excessive</strong> propositions.</span></div>`;
      }
      if (compare.miss.length && level != Analyzer.NONE) {
        content += `<div class="d-flex align-items-center"><i class="bi bi-exclamation-triangle-fill text-danger fs-1 mx-3"></i> `;
        content += `<span>You have <strong class="text-danger fs-bold">${compare.miss.length} missing</strong> propositions.</span></div>`;
      }

      if (compare.excess.length == 0 && compare.miss.length == 0) {
        content = `<div class="d-flex align-items-center"><i class="bi bi-check-circle-fill text-success fs-1 mx-3"></i> `;
        content += `<span><span class="text-success">Great!</span><br>All the propositions are <strong class="text-success fs-bold">matching</strong>.</span></div>`;
      }

      $("#feedback-dialog .feedback-content").html(content);
      return feedbackDialog;
    };

    let userDialog = UI.modal("#user-dialog", {
      hideElement: ".bt-close",
      backdrop: false,
      draggable: true,
      dragHandle: ".drag-handle",
      width: 375,
    });

    /**
     * Open or Create New Kit
     * */

    $(".app-navbar").on("click", ".bt-open-kit", () => {
      if (feedbackDialog.learnerMapEdgesData)
        $(".app-navbar .bt-clear-feedback").trigger("click");
      let tid = openDialog.tid;
      if (!tid)
        $("#concept-map-open-dialog .list-topic .list-item.default").trigger("click");
      else
        $(`#concept-map-open-dialog .list-topic .list-item[data-tid="${tid}"]`).trigger("click");
      $("#concept-map-open-dialog .bt-refresh-topic-list").trigger("click");

      // console.log(CDM);

      let userid = ""; // decodeURIComponent(App.getCookie('userid') ?? "");
      // console.log(userid);
      // if (!userid || userid == "") userid = decodeURIComponent(CDM.userid ?? "");
      // console.log(userid, CDM.userid, userid == "undefined");
      if (userid == "undefined" || userid == "null") userid = undefined;
      $('input[name="userid"]').val(userid ?? "");
      openDialog.show();
      setTimeout(() => { // console.log(userid, !userid);
        if (!userid) $('input[name="userid"]').focus().trigger('click');
        else $('input[name="mapid"]').focus().trigger('click');
      }, 300);
    });

    // Export recorded logs as a JSON file
    $(".app-navbar").on("click", ".bt-export-log", () => {
      if (!Logger.records.length) {
        UI.warning("No log recorded yet.").show();
        return;
      }
      let userid = Logger.userid ?? CDM.userid ?? 'anon';
      let stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let blob = new Blob([JSON.stringify(Logger.records, null, 2)], {type: 'application/json'});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kbx-log_${userid}_${stamp}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('#concept-map-open-dialog').on('submit', (e) => { // console.error(e);
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    // Populate soal picker from Soal-Web/manifest.json
    App.seriesMap = {}; // { KB01: [1,2,3], ... } derived from KB filenames
    let populateSoalPicker = () => {
      let select = $('#concept-map-open-dialog select.soal-picker');
      if (select.find('optgroup').length) return; // already populated
      fetch('Soal-Web/manifest.json')
        .then((r) => r.json())
        .then((manifest) => {
          // Derive KB series (KB01 -> levels 1,2,3) from filenames
          for (let f of (manifest.KB || [])) {
            let m = f.match(/^(KB\d+)_level(\d+)-web\.json$/);
            if (m) (App.seriesMap[m[1]] ??= []).push(Number(m[2]));
          }
          App.manifest = manifest;
          let seriesIds = Object.keys(App.seriesMap).sort();
          if (seriesIds.length) {
            let og = $('<optgroup>').attr('label', 'KB Series (Level 1 → 3)');
            for (let kb of seriesIds) {
              let levels = App.seriesMap[kb].sort((a, b) => a - b);
              og.append($('<option>').val(`series:${kb}`).text(`${kb} (Level ${levels.join(', ')})`));
            }
            select.append(og);
          }
          // Benchmark as a single nextable series (range comes from the manifest)
          if ((manifest.Benchmark || []).length) {
            let n = manifest.Benchmark.length;
            let og = $('<optgroup>').attr('label', 'Benchmark Series');
            og.append($('<option>').val('series:BENCHMARK')
              .text(`Benchmark — perf 01–${String(n).padStart(2, '0')} (Next)`));
            select.append(og);
          }
          // Individual Benchmark soal files (single perf)
          if ((manifest.Benchmark || []).length) {
            let og = $('<optgroup>').attr('label', 'Benchmark (single soal)');
            for (let f of manifest.Benchmark)
              og.append($('<option>').val(`Soal-Web/Benchmark/${f}`).text(f.replace(/-web\.json$/, '')));
            select.append(og);
          }
          // Individual KB soal files (single level)
          if ((manifest.KB || []).length) {
            let og = $('<optgroup>').attr('label', 'KB (single level)');
            for (let f of manifest.KB)
              og.append($('<option>').val(`Soal-Web/KB/${f}`).text(f.replace(/-web\.json$/, '')));
            select.append(og);
          }
        })
        .catch((err) => console.warn('Soal manifest not available:', err));
    };
    populateSoalPicker();

    // Picking a single soal fetches its JSON into #cmapdata.
    // Series entries (value "series:KBxx") are handled on Open Map instead.
    $('#concept-map-open-dialog').on('change', 'select.soal-picker', (e) => {
      let url = $(e.currentTarget).val();
      if (!url || url.startsWith('series:')) return;
      fetch(url)
        .then((r) => r.text())
        .then((text) => {
          JSON.parse(text); // validate
          $('#cmapdata').val(text);
        })
        .catch((error) => UI.error(`Unable to load soal: ${error}`).show());
    });

    // Uploading a JSON file reads it into #cmapdata
    $('#concept-map-open-dialog').on('change', 'input.soal-file', (e) => {
      let file = e.currentTarget.files[0];
      if (!file) return;
      file.text().then((text) => {
        JSON.parse(text); // validate
        $('#cmapdata').val(text);
        $('#concept-map-open-dialog select.soal-picker').val('');
      }).catch((error) => UI.error(`Invalid soal file: ${error}`).show());
    });

    // --- KB series (multi-level) support ---
    App.series = null; // { kb: 'KB01', levels: [1,2,3], index: 0 }

    let loadSoalUrl = (url) => fetch(url)
      .then((r) => r.text())
      .then((text) => {
        let { conceptMap, kit } = JSON.parse(text);
        this.setKitCDM(kit, conceptMap);
        return App.openKit(kit, conceptMap);
      });

    let updateSeriesUI = () => {
      let s = App.series;
      let btn = $('.app-navbar .bt-next-level');
      let status = $('.app-navbar .series-status');
      if (!s) {
        btn.addClass('d-none');
        status.addClass('d-none').empty();
        return;
      }
      status.removeClass('d-none')
        .text(`${s.name} — ${s.items[s.index].label} (${s.index + 1}/${s.items.length})`);
      btn.removeClass('d-none');
      btn.html(s.index >= s.items.length - 1
        ? '<i class="bi bi-check2-circle"></i> Finish'
        : '<i class="bi bi-arrow-right-circle"></i> Next');
    };
    App.updateSeriesUI = updateSeriesUI;

    let loadSeriesLevel = () => {
      let s = App.series;
      return loadSoalUrl(s.items[s.index].url).then(() => updateSeriesUI());
    };
    App.loadSeriesLevel = loadSeriesLevel;

    // Advance to next level (or finish) — logs the current level's result first
    $(".app-navbar").on("click", ".bt-next-level", () => {
      let s = App.series;
      if (!s) return;
      let isLast = s.index >= s.items.length - 1;
      let label = s.items[s.index].label;
      let confirm = UI.confirm(isLast
        ? `Finish <b>${s.name}</b>? Your map for ${label} will be recorded.`
        : `Move on to the next item? Your map for ${label} will be recorded.`
      ).positive(() => {
        confirm.hide();
        let perf = (typeof Perf != "undefined") ? Perf.finish() : null;
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.canvas(dataMap, App.inst.canvas);
        L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
        L.log('submit-level', { series: s.name, step: s.index + 1, label: label, perf: perf }, dataMap);
        if (isLast) {
          let name = s.name;
          App.series = null;
          updateSeriesUI();
          UI.dialog(`All items for <b>${name}</b> completed. Well done!`).show();
          return;
        }
        s.index++;
        loadSeriesLevel().then(() => {}, (error) => UI.error(error).show());
      }).show();
    });

    $('#concept-map-open-dialog').on('click', '.bt-open-cmap', (e) => { //console.warn(e);

      let remember = $('#concept-map-open-dialog input#inputrememberme:checked').val();
      let userid = $('#concept-map-open-dialog input[name="userid"]').val().trim();
      // let mapid = $('#concept-map-open-dialog input[name="mapid"]').val().trim();
      // let url = Core.instance().config('baseurl') + `mapApi/get/${mapid}`;

      // if (userid.trim().length == 0) {
      //   UI.warningDialog("Please enter a username or ID.").show();
      //   return;
      // }
      // if (mapid.trim().length == 0) {
      //   UI.warningDialog("Please enter Kit-Build kit ID to open.").show();
      //   return;
      // }
      // // console.log(url, remember, userid);
      // let currentLabel = Loading.load(e.currentTarget, "Retrieving data...");
      // Core.instance().ajax().post(url, {
      //   remember: remember ? 1 : 0,
      //   userid: userid
      // }).then(mapkit => {
      //   console.log(mapkit);
      //   let {kit, conceptMap} = this.unpackMapkit(mapkit);
      //   console.log(kit, conceptMap);
      //   let cmapData = { conceptMap: conceptMap, kit: kit};
      //   console.log(JSON.stringify(cmapData));
      //   $('#cmapdata').val(JSON.stringify(cmapData));
        CDM.userid = userid;

        // Series mode: "series:KBxx" (levels 1..3) or "series:BENCHMARK" (all perf files)
        let selected = $('#concept-map-open-dialog select.soal-picker').val();
        if (selected && selected.startsWith('series:')) {
          let key = selected.slice('series:'.length);
          let name = key, items = [];
          if (key === 'BENCHMARK') {
            name = 'Benchmark';
            for (let f of (App.manifest?.Benchmark || []))
              items.push({ label: f.replace(/-web\.json$/, ''), url: `Soal-Web/Benchmark/${f}` });
          } else {
            let levels = (App.seriesMap[key] || [1, 2, 3]).slice().sort((a, b) => a - b);
            items = levels.map((n) => ({ label: `Level ${n}`, url: `Soal-Web/KB/${key}_level${n}-web.json` }));
          }
          if (!items.length) { UI.error('No items found for this series.').show(); return; }
          App.series = { name: name, items: items, index: 0 };
          App.loadSeriesLevel().then(
            () => {
              openDialog.hide();
              App.postOpenKit(userid, remember);
            },
            (error) => UI.error(error).show()
          );
          return;
        }

        // Single soal mode
        App.series = null;
        App.updateSeriesUI();
        let {conceptMap, kit} = JSON.parse($('#cmapdata').val());
        this.setKitCDM(kit, conceptMap);
        console.log(conceptMap, kit);
        App.openKit(kit, conceptMap).then(
          (result) => { // console.log(result);
            openDialog.hide();
            App.postOpenKit(userid, remember);
          },
          (error) => UI.error(error).show()
        );
      // }).catch(error => {
      //   console.error(error);
      //   UI.errorDialog(error).show();
      //   return;
      // }).finally(()=>{
      //   Loading.done(e.currentTarget, currentLabel);
      // });
    });

    $('#concept-map-open-dialog').on('click', '.bt-open-id', (e) => { // console.warn(e);
      
      let remember = $('#concept-map-open-dialog input#inputrememberme:checked').val();
      let userid = $('#concept-map-open-dialog input[name="userid"]').val().trim();
      let mapid = $('#concept-map-open-dialog input[name="mapid"]').val().trim();
      let url = Core.instance().config('baseurl') + `mapApi/get/${mapid}`;

      if (userid.trim().length == 0) {
        UI.warningDialog("Please enter a username or ID.").show();
        return;
      }
      if (mapid.trim().length == 0) {
        UI.warningDialog("Please enter Kit-Build kit ID to open.").show();
        return;
      }
      // console.log(url, remember, userid);
      let currentLabel = Loading.load(e.currentTarget, "Retrieving data...");
      Core.instance().ajax().post(url, {
        remember: remember ? 1 : 0,
        userid: userid
      }).then(mapkit => {
        console.log(mapkit);
        let {kit, conceptMap} = this.unpackMapkit(mapkit);
        console.log(kit, conceptMap);
        let cmapData = { conceptMap: conceptMap, kit: kit};
        console.log(JSON.stringify(cmapData));
        $('#cmapdata').val(JSON.stringify(cmapData));
        this.setKitCDM(kit, conceptMap);
        CDM.userid = userid;



        // App.openKit(kit, conceptMap).then(
        //   (result) => { console.log(result);
        //     openDialog.hide();
        //     App.postOpenKit(userid, remember);
        //   },
        //   (error) => UI.error(error).show()
        // );
      }).catch(error => {
        console.error(error);
        UI.errorDialog(error).show();
        return;
      }).finally(()=>{
        Loading.done(e.currentTarget, currentLabel);
      });
    });

    // $('#concept-map-open-dialog').on('click', '.bt-open-url', (e) => {
    //   e.preventDefault();
    //   // let url = Core.instance().config('baseurl') + "mapApi/get";
    //   let remember = $('#concept-map-open-dialog input#inputrememberme:checked').val();
    //   let userid = $('#concept-map-open-dialog input[name="userid"]').val().trim();
    //   let url = $('#concept-map-open-dialog input[name="mapurl"]').val().trim();
    //   if (url.length == 0) {
    //     UI.warningDialog("Please enter an URL that refer to a Kit-Build kit map data.")
    //       .show();
    //     return;
    //   }

    //   Core.instance().ajax().post(url, {
    //     remember: remember ? 1 : 0,
    //     userid: userid
    //   }).then(result => { // console.log(result.mapdata);
    //     let data = App.parseIni(result.mapdata);
    //     try {
    //       let conceptMap = Core.decompress(data.conceptMap.replaceAll('"',''));
    //       let kit = Core.decompress(data.kit.replaceAll('"',''));
    //       // console.log(conceptMap, kit);
    //       CDM.conceptMap = conceptMap;
    //       CDM.kitId = kit.map.id;
    //       CDM.conceptMapId = kit.map.cmid;
    //       CDM.kit = kit;
    //       // console.error(CDM);
    //     } catch(e) { console.error(e); }
    //     CDM.userid = $('#concept-map-open-dialog input[name="userid"]').val().trim();
    //     if (!CDM.conceptMap) { // console.error("X");
    //       UI.errorDialog("Invalid concept map data.").show();
    //       return;
    //     }
    //     if (!$('#concept-map-open-dialog input[name="userid"]').val().trim()) {
    //       UI.warningDialog("Please enter your name or a user ID.").show();
    //       return;
    //     }
    //     App.openKit().then(() => {
    //       App.postOpenKit(userid, remember);
    //       openDialog.hide();
    //     });
    //     // console.log(data);
    //     // console.warn("Log status: ", result);
    //   }).catch(error => {
    //     console.error("Log error: ", error);
    //     UI.errorDialog("Invalid concept map data.").show();
    //     return;
    //   });
    // });

    // $('#concept-map-open-dialog').on('click', '.bt-open', (e) => {
    //   if (!CDM.conceptMap) { 
    //     UI.errorDialog("Invalid concept map data.").show();
    //     return;
    //   }
    //   if (!$('#concept-map-open-dialog input[name="userid"]').val().trim()) {
    //     UI.warningDialog("Please enter your name or a user ID.").show();
    //     return;
    //   }
    //   App.openKit().then(() => {
    //     CDM.userid = $('#concept-map-open-dialog input[name="userid"]').val().trim();
    //     App.postOpenKit();
    //     openDialog.hide();
    //   });
    // });

    /**
     *
     * Export
     * 
     **/

    $(".app-navbar .bt-export").on("click", (e) => {
      // console.log(this.conceptMap);
      let data = {};
      data.canvas = KitBuildUI.buildConceptMapData(this.canvas);
      data.map = {
        cmid: this.conceptMap ? this.conceptMap.map.cmid : App.uuidv4(),
        direction: this.canvas.direction,
      }; // console.log(data);
      $("#concept-map-export-dialog .encoded-data").val(
        `conceptMap=${Core.compress(data)}`
      );
      App.dialogExport = (new CoreWindow('#concept-map-export-dialog', {
        draggable: true,
        width: '650px',
        height: '600px',
        closeBtn: '.bt-cancel'
      })).show();
    });

    $("#concept-map-export-dialog").on("click", ".bt-clipboard", async (e) => { // console.log(e);
      navigator.clipboard.writeText($("#concept-map-export-dialog .encoded-data").val().trim());
      $(e.currentTarget).html('<i class="bi bi-clipboard"></i> Data has been copied to Clipboard!');
      setTimeout(() => {
        $(e.currentTarget).html('<i class="bi bi-clipboard"></i> Copy to Clipboard');
      }, 3000);
      // let dataMap = L.dataMap(CDM.conceptMapId);
      // L.canvas(dataMap, App.inst.canvas);
      // L.proposition(dataMap, App.inst.canvas);
      // L.log('concept-map-export', {duration: App.timer.ts}, dataMap);
    });

    $("#concept-map-export-dialog").on("click", ".bt-download-cmap", async (e) => { // console.log(e);
      let cmapdata = $("#concept-map-export-dialog .encoded-data").val().trim();
      App.download(`${CDM.conceptMapId ?? 'untitled'}.cmap`, cmapdata);
      // let dataMap = L.dataMap(CDM.conceptMapId);
      // L.canvas(dataMap, App.inst.canvas);
      // L.proposition(dataMap, App.inst.canvas);
      // L.log('concept-map-download-cmap', {duration: App.timer.ts}, dataMap);
    });

    /**
     * Content
     * */

    $(".app-navbar").on("click", ".bt-content", () => {
      // console.log(App.inst)
      if (!CDM.kit) {
        UI.dialog("Please open a kit to see its content.").show();
        return;
      }
      contentDialog.setContent(this.text).show();
    });

    $("#kit-content-dialog .bt-scroll-top").on("click", (e) => {
      $("#kit-content-dialog .content").parent().animate({ scrollTop: 0 }, 200);
    });

    $("#kit-content-dialog .bt-scroll-more").on("click", (e) => {
      let height = $("#kit-content-dialog .content").parent().height();
      let scrollTop = $("#kit-content-dialog .content").parent().scrollTop();
      $("#kit-content-dialog .content")
        .parent()
        .animate({ scrollTop: scrollTop + height - 16 }, 200);
    });

    /**
     * Save Load Learner Map
     * */

    $(".app-navbar").on("click", ".bt-save", () => { 
      
      // console.log(CDM.kit, CDM.conceptMap);
      
      if (!CDM.kit) {
        UI.dialog('Invalid kit data.').show();
        return;
      }
      if (!CDM.conceptMap) {
        UI.dialog('Invalid concept map data.').show();
        return;
      }

      // console.log(CDM, App.collab?.getData('mapid'));
      // console.log(App.collab);
      this.saveConceptMap({type: 'draft'})
        .then(() => UI.success('Concept map has been saved.').show());

      // this.session.set('draft-map', Core.compress(data)).then((result) => {
      //   console.log(result);
      //   UI.success("Concept map has been saved successfully.").show();
      //   let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId);
      //   L.canvas(dataMap, App.inst.canvas);
      //   L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
      //   L.log('save-draft', {
      //     id: data.id,
      //     cmid: data.cmid,
      //     userid: data.userid,
      //     sessid: data.sessid
      //   }, dataMap);
      // }, (error) => console.error(error));
      // this.ajax
      //   .post("mapApi/saveCollabMap", data)
      //   .then(collabMap => { console.log(collabMap);
      //     data.id = collabMap.id;
      //     data.created = collabMap.created;
      //     data.duration = App.timer.ts;
      //     let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId);
      //     L.canvas(dataMap, App.inst.canvas);
      //     L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
      //     L.log('save-map', data, dataMap);
      //     UI.info('Map has been saved.').show();
      //   }).catch((error) => {
      //     console.error(error);
      //   });


    });
    $(".app-navbar").on("click", ".bt-load", () => {

      if (!App.collab?.getData('mapid')) {
        $('.dd-saved-maps .saved-maps').html('<li class="text-center text-muted"><em>No Data.</em></li>');
        UI.error('Cannot load, invalid Map ID').show();
        return;
      }

      if (!KitBuildCollab.getPersonalRoom()?.name) {
        UI.error('Cannot load, invalid Room').show();
        $('.dd-saved-maps .saved-maps').html('<li class="text-center text-muted"><em>No Data.</em></li>');
        return;
      }

      let room = btoa(KitBuildCollab.getPersonalRoom()?.name);
      let mapid = btoa(App.collab?.getData('mapid'));
      console.log(KitBuildCollab.getPersonalRoom().name, App.collab?.getData('mapid'));

      this.ajax.get(`mapApi/getCollabMapList/${room}/${mapid}/8`).then((maps) => {
        let mapsHtml = '';
        if (maps?.length > 0) {
          for(let map of maps) {
            let type = (map.type == 'draft') ? 'warning' : 'success'
            mapsHtml += `<li>`
            mapsHtml += `<a class="dropdown-item fs-6 d-flex flex-column justify-content-between align-items-center item-saved-map" href="#" data-id="${map.id}">`;
            mapsHtml += `<small>${map.userid}</small>`;
            mapsHtml += `<small>`;
            mapsHtml += `<span class="badge text-bg-${type} me-2"> </span>`;
            mapsHtml += `<code class="text-danger">${map.created}</code>`;
            mapsHtml += `</small>`;
            mapsHtml += `</a>`;
            mapsHtml += `</li>`;
          }
        } else mapsHtml = '<li><a href="#" class="dropdown-item fs-6 text-muted fst-italic"><i class="bi bi-exclamation-triangle"></i><small class="ms-2 text-danger">No saved data.</small></a></li>';
        $('.dd-saved-maps .saved-maps').html(mapsHtml);
      });

      return;
      if(!CDM.kit) {
        UI.dialog('Please open a kit prior to loading.').show();
        return;
      }

      this.session.get('draft-map').then(result => {
        let lmapdata = Core.decompress(result);

        console.warn(lmapdata, App.getCookie(CDM.cookieid));

        if (!lmapdata.data || !lmapdata.data.map) {
          UI.error('Invalid data.').show();
          return;
        }
        if(lmapdata.id != CDM.kit.map.id ||
          lmapdata.cmid != CDM.kit.map.cmid ||
          lmapdata.userid != CDM.userid
        ) {
          UI.error('Invalid draft.').show();
          return;
        }

        UI.confirm('Replace current concept map with the saved one?')
          .positive(e => {
            console.log(lmapdata);
            lmapdata.data.canvas.conceptMap = CDM.conceptMap.canvas;
            let lmap = KitBuildUI.composeLearnerMap(lmapdata.data.canvas);
            console.log(lmap);
            this.canvas.cy.elements().remove();
            this.canvas.cy.add(lmap);
            this.canvas.applyElementStyle();
            this.canvas.toolbar.tools
              .get(KitBuildToolbar.CAMERA)
              .fit(null, { duration: 0 });
            KitBuildUI.showBackgroundImage(this.canvas);

            let sessid = App.getCookie(CDM.cookieid); 
            console.log(sessid, lmapdata.sessid);

            let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId);
            L.canvas(dataMap, App.inst.canvas);
            L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
            L.log('load-draft', {
              sessid: sessid,
              psessid: lmapdata.sessid
            }, dataMap);
            App.lastFeedback = App.timer.ts;
            App.postOpenKit();

          }).show();
      });

      // let kit = CDM.kit;
      // if (!kit) {
      //   UI.warning("Please open a kit.").show();
      //   return;
      // }
      // if (feedbackDialog.learnerMapEdgesData)
      //   $(".app-navbar .bt-clear-feedback").trigger("click");

      // let data = {
      //   kid: kit.map.kid,
      //   username: App.inst.user.username,
      // };
      // if (!data.username) delete data.username;
      // this.ajax
      //   .post("kitBuildApi/getLastDraftLearnerMapOfUser", data)
      //   .then((learnerMap) => {
      //     if (!learnerMap) {
      //       UI.warning("No user saved map data for this kit.").show();
      //       return;
      //     }
      //     if (this.canvas.cy.elements().length) {
      //       let confirm = UI.confirm("Load saved concept map?")
      //         .positive(() => {
      //           learnerMap.kit = kit;
      //           learnerMap.conceptMap = kit.conceptMap;
      //           this.canvas.cy.elements().remove();
      //           this.canvas.cy.add(KitBuildUI.composeLearnerMap(learnerMap));
      //           this.canvas.applyElementStyle();
      //           this.canvas.toolbar.tools
      //             .get(KitBuildToolbar.CAMERA)
      //             .fit(null, { duration: 0 })
      //             .then(() => {
      //               App.collab(
      //                 "command",
      //                 "set-kit-map",
      //                 kit,
      //                 this.canvas.cy.elements().jsons()
      //               );
      //             });
      //           App.inst.setLearnerMap(learnerMap);
      //           this.logger.setLearnerMapId(learnerMap.map.lmid);
      //           L.log("load-learner-map", learnerMap.map, null, {
      //             includeMapData: true,
      //             lmid: learnerMap.map.lmid,
      //           });
      //           UI.info("Concept map loaded.").show();
      //           confirm.hide();
      //         })
      //         .show();
      //       return;
      //     }
      //     App.openLearnerMap(learnerMap.map.lmid, this.canvas);
      //   })
      //   .catch((error) => {
      //     console.error(error);
      //     UI.error("Unable to load saved concept map.").show();
      //   });
    });

    $('ul.saved-maps').on('click', 'a.item-saved-map', (e) => {
      let id = $(e.currentTarget).attr('data-id');
      let confirm = UI.confirm(
        `Load selected map?<br>Loaded map will be <strong class="text-primary">synchronized</strong> to all team members in the room.`
      ).emphasize().positive(() => {
        App.collab.loadCollabMap(id);
        confirm.hide();
      }).negative(() => confirm.hide())
      .show();
    });

    /**
     * Peer map viewer
     */

    $('ul.peer-maps').on('click', 'a.item-peer-map', (e) => {
      let userid = $(e.currentTarget).attr('data-userid');
      const filename = userid.split("/")[0];
      const basefileurl = Core.instance().config('basefileurl');
      // console.log(Core, filename, Core.instance().config('basefileurl'), App.collab);
      const mapid = App.collab?.getData('mapid');
      const url = `${basefileurl}files/peermaps/${mapid}/${filename}.png`;
      // console.log(url);
      App.peerDialog = 
        UI.modal('#peer-map-dialog', {
          width: '90%', height: 600, 
          hideElement: '.bt-close',
          backdrop: false,
          keyboard: false,
          onShow: (e, data) => {
            console.log(e, data);
            let imguserid = $('.peer-image').attr('data-userid') ?? undefined;
            if (!imguserid) $('.peer-image').attr('data-userid', userid);
            if (imguserid != userid) {
              console.log('loading...');
              $('.peer-image').attr('src', url).one('load', (e) => {
                const w = $('.peer-image').attr('data-width') ?? $('.peer-image').width();
                console.log('loaded!');
                $('.peer-image').attr('data-userid', userid);
                $('.peer-image').attr('data-width', w);
                $('.peer-image').width(w * 0.4);                
              });

            }
            $('.peer-name').html(userid);
          }
        }).show();
      UI.makeResizable('#peer-map-dialog', {handle: '.bt-resize'});
      UI.makeDraggable('#peer-map-dialog', {handle: '.drag-handle'});
      App.peerDialog.on('event', (e, data) => {
        console.log(e, data);
      })
    });

    $('.bt-load-reciprocal-map').on('click', async (e) => {
      let room = KitBuildCollab?.getPersonalRoom()?.name;
      if (!room) {
        UI.error('Not in a Room.').show();
        return;
      }
      App.collab?.send('command', 'load-reciprocal-map', room);
    });

    /**
     * Reset concept map to kit
     * */

    $(".app-navbar").on("click", ".bt-reset", (e) => {
      if (!CDM.kit) {
        UI.info("Invalid kit.").show();
        return;
      }
      if (!CDM.conceptMap) {
        UI.info("Invalid concept map.").show();
        return;
      }
      if (feedbackDialog.learnerMapEdgesData)
        $(".app-navbar .bt-clear-feedback").trigger("click");

      let question = (App.collab)
        ? `Do you want to reset this concept map as the initial kit/concept map?<br><span class="text-danger">Your team concept map will also reset.</span> <strong>Continue?</strong>`
        : `Do you want to <span class="text-danger">reset</span> this concept map as the initial kit/concept map?`
      let confirm = UI.confirm(question).positive(() => {

        // let canvasJsons = this.canvas.cy.elements().jsons();
        // let dataMap = new Map([
        //   ['kid', CDM.kitId],
        //   ['cmid', CDM.conceptMapId],
        //   ['canvas', Core.compress(canvasJsons)],
        // ]);
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.canvas(dataMap, App.inst.canvas); 
        L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
        L.log("reset", CDM.kitId, dataMap);

        if (App.collab) App.collab?.send("command", "reset");
        else {
          App.openKit(CDM.kit, CDM.conceptMap).then(
            (result) => {
              let undoRedo = this.canvas.toolbar.tools.get(KitBuildToolbar.UNDO_REDO);
              if (undoRedo) undoRedo.clearStacks().updateStacksStateButton();
              UI.info("Concept map has been reset.").show();
              confirm.hide();
              // TODO: sync 
              // App.lastFeedback = App.timer.ts;
            },
            (error) => UI.error(error).show()
          );
        }
        // App.parseKitMapOptions(CDM.kit);
        // App.resetMapToKit(CDM.kit, this.canvas).then(() => {
        //   // Remove attribute of image binary data 
        //   let attrs = ['image', 'bug'];
        //   let canvas = this.canvas.cy.elements().jsons(); // console.log(canvas);
        //   for(let el of canvas) {
        //     for (let attr of attrs) { // console.log(el, el.data[attr])
        //       if (el.data.image) delete el.data[attr];
        //     }
        //   }
        //   let dataMap = new Map([["cmapid", CDM.kitId]]);
        //   dataMap.set('canvas', Core.compress(canvas));
        //   let learnerMapData = KitBuildUI.buildConceptMapData(this.canvas);
        //   learnerMapData.conceptMap = CDM.conceptMap.canvas;
        //   // console.log(learnerMapData);
        //   Analyzer.composePropositions(learnerMapData);
        //   // let direction = CDM.conceptMap.map.direction;
        //   // let compare = Analyzer.compare(learnerMapData, direction);
        //   // console.warn(compare);
        //   // dataMap.set('compare', Core.compress(compare)); 
        //   L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
        //   L.log("reset", null, dataMap);
        //   App.postOpenKit(CDM.userid);
        //   // App.collab(
        //   //   "command",
        //   //   "set-kit-map",
        //   //   kit,
        //   //   this.canvas.cy.elements().jsons()
        //   // );
        //   // L.log("reset-learner-map", CDM.kit.map, null, {
        //   //   includeMapData: true,
        //   //   lmid: this.learnerMap.map.lmid,
        //   // });
        // });
        return;
      })
      .negative(() => confirm.hide())
      .show();
    });

    /**
     *
     * Feedback
     */
    $(".app-navbar").on("click", ".bt-feedback", () => {
      if (!CDM.kit) {
        UI.dialog('Please open a kit.').show();
        return;
      } 

      // console.log(App.timer, App.timer.ts, App.lastFeedback);
      // if (!App.lastFeedback) {
      //   if (App.timer.ts < App.feedbackDelay) {
      //     let timeleft = App.feedbackDelay - (App.timer.ts - (App.lastFeedback ?? 0));
      //     UI.dialog(`Feedback is not available right now. Please wait for ${timeleft} seconds`).show();
      //     return;
      //   }
      //   // App.lastFeedback = App.timer.ts;
      // } else {
      //   if (App.timer.ts - App.lastFeedback < App.feedbackDelay || App.timer.ts < App.feedbackDelay) {
      //     let timeleft = App.feedbackDelay - (App.timer.ts - App.lastFeedback);
      //     UI.dialog(`Feedback is not available right now. Please wait for ${timeleft} seconds`).show();
      //     return;
      //   }
      // }

      if (feedbackDialog.learnerMapEdgesData)
        $(".app-navbar .bt-clear-feedback").trigger("click");
      feedbackReasonDialog.show();
      return;      
    });
    $('#feedback-reason-dialog').on('click', '.bt-get-feedback', (e) => {

      let cor = $('#inputcorrect').prop('checked');
      let inf = $('#inputinformation').prop('checked');
      let und = $('#inputunderstand').prop('checked');
      let oth = $('#inputotherreason').val().trim();

      let reason = [];
      if (cor) reason.push('cor');
      if (inf) reason.push('inf');
      if (und) reason.push('und');
      if (oth.length != 0) reason.push($('#inputotherreason').val().trim());

      if (!(cor || inf || und || oth.length != 0)) {
        UI.dialog('Please provide a reason for feedback.').show();
        return;
      } 

      feedbackReasonDialog.hide();

      let learnerMapData = KitBuildUI.buildConceptMapData(this.canvas);
      feedbackDialog.learnerMapEdgesData = this.canvas.cy.edges().jsons();
      learnerMapData.conceptMap = CDM.conceptMap.canvas;
      // console.log(CDM);
      // console.log(learnerMapData);
      Analyzer.composePropositions(learnerMapData);
      let direction = CDM.conceptMap.map.direction;
      // console.warn(CDM.kit, CDM.kit.map);
      let feedbacklevel = CDM.kit.parsedOptions.feedbacklevel;
      let compare = Analyzer.compare(learnerMapData, direction);
      // console.log(compare);
      let level = Analyzer.NONE;
      let dialogLevel = Analyzer.NONE;
      switch (feedbacklevel) {
        case 0:
        case 1:
          level = Analyzer.NONE;
          break;
        case 2:
          level = Analyzer.MATCH | Analyzer.EXCESS;
          break;
        case 3:
          level = Analyzer.MATCH | Analyzer.EXCESS | Analyzer.EXPECT;
          break;
        case 4:
          level = Analyzer.MATCH | Analyzer.EXCESS | Analyzer.MISS;
          break;
      }
      switch (feedbacklevel) {
        case 0:
          dialogLevel = Analyzer.NONE;
          break;
        case 1:
        case 2:
        case 3:
        case 4:
          dialogLevel = Analyzer.MATCH | Analyzer.EXCESS;
          break;
      }

      Analyzer.showCompareMap(compare, this.canvas.cy, direction, level);
      this.canvas.toolCanvas
        .enableIndicator(false)
        .enableConnector(false)
        .clearCanvas()
        .clearIndicatorCanvas();

      if (feedbacklevel == 0) {
        UI.dialog("Feedback is not enabled for this kit.")
          .on("dismiss", () => {
            $(".app-navbar .bt-clear-feedback").trigger("click");
          })
          .show();
      } else feedbackDialog.setCompare(compare, dialogLevel).show();
      let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
      // dataMap.set('compare', JSON.stringify(compare));
      L.canvas(dataMap, App.inst.canvas);
      L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
      L.log("feedback", {
        level: level,
        compare: compare,
        reason: reason
      }, dataMap);
      $(".app-navbar .bt-feedback").prop('disabled', true);
      $(".app-navbar .bt-clear-feedback").prop('disabled', false);
      App.lastFeedback = App.timer.ts;
    });
    $(".app-navbar").on("click", ".bt-clear-feedback", () => {
      if (!feedbackDialog.learnerMapEdgesData) return;
      this.canvas.cy.edges().remove();
      this.canvas.cy.add(feedbackDialog.learnerMapEdgesData);
      this.canvas.applyElementStyle();
      this.canvas.toolCanvas
        .enableIndicator()
        .enableConnector()
        .clearCanvas()
        .clearIndicatorCanvas();
      feedbackDialog.learnerMapEdgesData = null;
      let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
      L.log("resume-feedback", undefined, dataMap);
      $(".app-navbar .bt-feedback").prop('disabled', false);
      $(".app-navbar .bt-clear-feedback").prop('disabled', true);
      App.lastFeedback = App.timer.ts;
    });
    $('#feedback-nearby-dialog').on('click', '.bt-get-feedback', e => {
      let inf = $('#feedback-nearby-dialog .inputinformation').prop('checked');
      let und = $('#feedback-nearby-dialog .inputunderstand').prop('checked');
      let oth = $('#feedback-nearby-dialog .inputotherreason').val().trim();
      // console.log(inf, und, oth);

      let reason = [];
      if (inf) reason.push('inf');
      if (und) reason.push('und');
      if (oth.length != 0) reason.push($('#feedback-nearby-dialog .inputotherreason').val().trim());
      if (!inf && !und && oth.length != 0) und = true;

      if (!(inf || und || oth.length != 0)) {
        UI.dialog('Please provide a reason for feedback.').show();
        return;
      } 

      this.feedbackNearbyDialog.hide();

      if (und) {
        let nodes = App.inst.feedbackNearbyDialog.nodes;

        if (!nodes || !nodes[0].data().resid) {
          inf = true;
        } else {
          let id = nodes[0].data().resid;
          let page = nodes[0].data().respage;
          let keyword = nodes[0].data().reskeyword;
          let cmid = CDM.kit.map.cmid;
          let nodeData = nodes[0].data();
  
          var showReference = (result) => {
            let pdfData = atob(result.data.split(',')[1]);
            if (PDFApp.modal) {
              PDFApp.modal.show();
              PDFApp.app.search('');
              PDFApp.app.goToPage(page);
              PDFApp.app.search(keyword);
            } else {
              PDFApp.app = PDFApp.instance('#pdf-dialog', {
                width: '800px',
                height: '550px',
                pdfData: pdfData,
                page: page,
                keyword: keyword,
                fileName: id
              });
              // console.log(PDFApp.app, PDFApp.inst);
              PDFApp.app.on('event', (e, data) => {
                if (e == 'hide') L.log('close-reference', nodeData);
              });
              PDFApp.app.load();
            }
  
            App.lastFeedback = App.timer.ts;
  
            let data = Object.assign({
              type: result.type,
              reason: reason,
              timestamp: App.timer.ts
            }, nodes[0].data());
            let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
            L.canvas(dataMap, App.inst.canvas);
            L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
            L.log('get-reference', data, dataMap);
          }
  
          let ref = CDM.references.get(`${id}/${cmid}`);
          if (!ref) {
            this.ajax.get(`mapApi/getConceptMapReference/${id}/${cmid}`).then(result => {
              CDM.references.set(`${id}/${cmid}`, result);
              showReference(result);
            });  
          } else showReference(ref);
        }
      }

      if (inf) {
        let learnerMapData = KitBuildUI.buildConceptMapData(this.canvas);
        feedbackDialog.learnerMapEdgesData = this.canvas.cy.edges().jsons();
        learnerMapData.conceptMap = CDM.conceptMap.canvas;
        Analyzer.composePropositions(learnerMapData);
        let direction = CDM.conceptMap.map.direction;
        let compare = Analyzer.compare(learnerMapData, direction);
        
        this.canvas.toolCanvas
          .enableIndicator(false)
          .enableConnector(false)
          .clearCanvas()
          .clearIndicatorCanvas();
  
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.canvas(dataMap, App.inst.canvas);
        L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
        L.log("feedback-distance", {
          compare: compare,
          reason: reason,
          timestamp: App.timer.ts
        }, dataMap);
        $(".app-navbar .bt-feedback").prop('disabled', true);
        $(".app-navbar .bt-clear-feedback").prop('disabled', false);
        let disTool = this.canvas.toolCanvas.tools.get(KitBuildCanvasTool.DISTANCECOLOR);
        let node = this.canvas.cy.nodes('#'+this.feedbackNearbyDialog.nodeId);
        disTool.showNearby(node);
        App.lastFeedback = App.timer.ts;
      }




    });

    /**
     *
     * Submit
     */
    $(".app-navbar").on("click", ".bt-submit", () => {
      if (feedbackDialog.learnerMapEdgesData)
        $(".app-navbar .bt-clear-feedback").trigger("click");
      let confirm = UI.confirm(
        "Do you want to submit your concept map?<br/>This will be marked as the end your concept map session."
      ).positive(() => {
        confirm.hide();
        // Capture performance for this level first (independent of backend save)
        let perf = (typeof Perf != "undefined") ? Perf.finish() : null;
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.canvas(dataMap, App.inst.canvas);
        L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
        L.log('submit', { perf: perf }, dataMap);
        UI.dialog("Concept map has been submitted.").show();
        // Best-effort persistence (no-op if backend is unavailable)
        this.saveConceptMap({type: 'final'}).catch(() => {});
        }).show();
    });

  }

  saveConceptMap(options) {
    return new Promise((resolve, reject) => {
      let settings = Object.assign({
        type: 'draft'
      }, options);
      let { data, lmapdata } = this.buildLearnerMapData(); // console.log(canvas);
      // console.log(data, lmapdata);
      data.type = settings.type;
      lmapdata.map.type = settings.type;

      data.room = KitBuildCollab?.getPersonalRoom()?.name;
      data.id = CDM.kit.map.id;
      data.mapid = App.collab?.getData('mapid');
      data.cmid = CDM.kit.map.cmid;
      data.userid = CDM.userid;
      data.data = JSON.stringify(lmapdata);
      data.kitdata = JSON.stringify(CDM.kit);
      data.cmapdata = JSON.stringify(CDM.conceptMap);
      data.sessid = App.getCookie(CDM.cookieid);

      // console.log(data, lmapdata); // return;
      let saveToSession = this.session.set('draft-map', Core.compress(data));
      let saveToCollabMap = this.ajax.post("mapApi/saveCollabMap", data);
      let saveLearnerMap = this.ajax.post("mapApi/saveLearnerMap", data);
      let saveMap = (data.room) ? saveToCollabMap : saveLearnerMap;
      Promise.all([saveToSession, saveMap]).then(result => {
        // let resultSession = result[0];
        // let resultCollabMap = result[1];
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.canvas(dataMap, App.inst.canvas);
        L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
        L.log(`save-${settings.type}`, {
          id: data.id,
          cmid: data.cmid,
          userid: data.userid,
          sessid: data.sessid
        }, dataMap);
        resolve(result);
      }).catch((err) => reject(err));
    });
    
  }

  unpackMapkit(result) {
    let data = App.parseIni(result.mapdata);
    try {
      let conceptMap = Core.decompress(data.conceptMap.replaceAll('"', ''));
      let kit = Core.decompress(data.kit.replaceAll('"', ''));
      return { conceptMap, kit }
    } catch (e) { console.error(e); }
    return {}
  }

  buildLearnerMapData() {
    this.canvas.cy.elements().removeClass('select').unselect();
    let lmapdata = {};
    lmapdata.canvas = KitBuildUI.buildConceptMapData(this.canvas);
    lmapdata.canvas.concepts.forEach(c => {
      let d = JSON.parse(c.data);
      delete d.image; // clean image data of lmap
      c.data = JSON.stringify(d);
    });
    lmapdata.map = {
      userid: CDM.userid ?? null,
      cmid: CDM.conceptMap.map.cmid ? CDM.conceptMap.map.cmid : null,
      kid: CDM.kit.map.id ? CDM.kit.map.id : null,
      type: 'final'
    };
    console.warn(lmapdata);
    let data = {
      id: null, // so it will insert new rather than update
      userid: lmapdata.map.userid,
      cmid: lmapdata.map.cmid,
      kid: lmapdata.map.kid,
      type: "final",
      data: Core.compress(lmapdata),
      created: null
    };
    delete data.id;
    delete data.created;
    return { data, lmapdata };
  }

  /**
   *
   * Handle refresh web browser
   */

  handleRefresh() {
    return new Promise((resolve, reject) => {
    //   this.session.getAll().then((sessions) => {
    //     Logger.userid = sessions.userid;
    //     Logger.sessid = App.getCookie(CDM.cookieid);
        Logger.canvasid = App.canvasId;
        this.canvas.on("event", App.onCanvasEvent);
    //     resolve(sessions);
    //     // console.log(sessions, document.cookie);
    //     // console.log(Logger.userid, Logger.sessid);  
    //   });
    });
  }

  onReferenceAction(nodes) {

    // if (!App.lastFeedback) {
    //   if (App.timer.ts < App.feedbackDelay) {
    //     let timeleft = App.feedbackDelay - (App.timer.ts - (App.lastFeedback ?? 0));
    //     UI.dialog(`Feedback is not available right now. Please wait for ${timeleft} seconds`).show();
    //     return;
    //   }
    //   // App.lastFeedback = App.timer.ts;
    // } else {
    //   if (App.timer.ts - App.lastFeedback < App.feedbackDelay || App.timer.ts < App.feedbackDelay) {
    //     let timeleft = App.feedbackDelay - (App.timer.ts - App.lastFeedback);
    //     UI.dialog(`Feedback is not available right now. Please wait for ${timeleft} seconds`).show();
    //     return;
    //   }
    // }

    // console.warn(nodes);

    App.inst.feedbackNearbyDialog.nodeId = nodes[0].data().id;
    App.inst.feedbackNearbyDialog.nodes = nodes;
    App.inst.feedbackNearbyDialog.show();

  }

  async startCollab(session = null) { // console.log(session);
    App.collab = await KitBuildCollab.instance('kitbuild', this.canvas, {
      host: this.config.get('collabhost'),
      port: this.config.get('collabport'),
      path: this.config.get('collabpath'),
      listener: this.onCollabEvent.bind(this),
      session: session
    }); // console.log(App.collab);
    if (session?.mapid)
      await App.collab?.setData('mapid', session.mapid);
    KitBuildCollab.enableControl();
    return App.collab;
  }

  // Collab Server --> App
  async onCollabEvent(e, ...data) { console.warn("Consuming collaboration event:", e, data);
    switch(e) {
      case 'reconnected':
      case 'connected':
        // check id from cookie
        let userid = decodeURIComponent(App.getCookie('userid')); console.log("Cookie", userid);
        if (userid == null || userid == "null" || userid == "undefined") {
          userid = decodeURIComponent(App.collab?.getCollabId()); console.log("Collab", userid);
        }
        console.log("Set", userid);
        if (userid != null && userid != "null" && userid != "undefined") {
          // console.log(userid);
          // console.log(Core.instance().cookie());
          Core.instance().cookie().set('userid', userid);
          // .then((e)=> console.log(e, userid));
          App.collab?.registerUser(userid);
          CDM.userid = userid;
          Logger.userid = userid;
          this.session.set('userid', userid);
        }
        let dataMap = L.dataMap(null, null, CDM.room);
        L.log(e, userid, dataMap);
        break;
      case 'socket-disconnect':
      case 'disconnect': {
        L.log(e);
      } break;
      case 'join-room': {
        let room = data.shift();
        CDM.room = room;
        let dataMap = L.dataMap(null, null, CDM.room);
        L.log("join-room", room, dataMap);
      } break;
      case 'user-unregistered': {
        let user = data.shift();
        App.removeCookie('userid');
        // Core.instance().cookie().unset('userid');
        L.log(e, user);
      } break;
      case 'socket-command': {
        let command = data.shift();
        switch(command) {
          case 'push-map-state':
            this.applyMapState(data.shift());
            let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
            L.log("socket-push-map-state", CDM.room, dataMap);
            break;
          case 'reset': {
            App.openKit(CDM.kit, CDM.conceptMap).then(
              (result) => {
                let undoRedo = this.canvas.toolbar.tools.get(KitBuildToolbar.UNDO_REDO);
                if (undoRedo) undoRedo.clearStacks().updateStacksStateButton();
                UI.info("Concept map has been reset.").show();
                let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
                L.canvas(dataMap, App.inst.canvas);
                L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
                L.log("socket-command-reset", CDM.room, dataMap);
              },
              (error) => UI.error(error).show()
            );
          } break;
          case 'load-reciprocal-map': {
            const room = data.shift();
            const pairs = await this.ajax.post(`collabApi/getRoomPairs`, {
              room: room.split("/")[1]
            });
            // console.log(pairs);

            const basefileurl = Core.instance().config('basefileurl');
            const mapid = App.collab?.getData('mapid');

            let promises = [];
            for(const pair of pairs) {
              const filename = pair?.userid?.split("/")[0];
              const url = `${basefileurl}files/peermaps/${mapid}/${filename}.cmap`;
              promises.push(this.ajax.get(url));
            }
            const results = await Promise.allSettled(promises);
            // console.log(results);
            const linkTargets = new Set();
            const commonLinkTargets = new Set();
            const cmapLinkTargets = new Set();
            CDM.conceptMap?.canvas?.linktargets?.forEach(lt => {
              cmapLinkTargets.add(`${lt.lid}-${lt.target_cid}`);
            });
            results.forEach(result => {
              if (result.status == 'fulfilled') {
                const mapData = result?.value?.replace("conceptMap=", "");
                const data = Core.decompress(mapData);
                // console.log(data);
                // compare with goal map
                // data?.canvas?.linktargets.forEach(linkTarget => {
                //   if (cmapLinkTargets.has(`${linkTarget.lid}-${linkTarget.target_cid}`))
                //     commonLinkTargets.add(`${linkTarget.lid}-${linkTarget.target_cid}`);
                //   else linkTargets.add(`${linkTarget.lid}-${linkTarget.target_cid}`);
                // });
                data?.canvas?.linktargets.forEach(lt => {
                  if (linkTargets.has(`${lt.lid}-${lt.target_cid}`))
                    commonLinkTargets.add(`${lt.lid}-${lt.target_cid}`);
                  else linkTargets.add(`${lt.lid}-${lt.target_cid}`);
                });
              }
            });
            // console.log(linkTargets, commonLinkTargets, cmapLinkTargets);
            // console.warn(CDM.conceptMap);
            // console.log(this.canvas.cy.edges());
            this.canvas?.cy?.edges('[type="right"]')?.remove();
            for(const link of commonLinkTargets) {
              const l = link.split("-");
              try {
                this.canvas?.createEdge({
                  source: l[0],
                  target: l[1],
                  type: 'right'
                });
              } catch(err) { console.error(err); }
            }

            let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
            L.canvas(dataMap, App.inst.canvas); 
            L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
            L.log("load-reciprocal-map", CDM.kitId, dataMap);
            
          } break;
        }
      } break;
      case 'socket-get-map-state': {
        let requesterSocketId = data.shift();
        this.generateMapState()
          .then(mapState => { // console.log(mapState);
            App.collab.send("send-map-state", requesterSocketId, mapState);
            let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
            L.canvas(dataMap, App.inst.canvas);
            L.compare(dataMap, App.inst.canvas, CDM.conceptMap?.canvas);
            L.log("send-map-state", {requesterSocketId: requesterSocketId}, dataMap);
          })
      }  break;
      case 'socket-set-map-state': {
        let mapState = data.shift(); // console.log(mapState);
        this.applyMapState(mapState).then(() => { // console.log(this);
          App.collab.send("get-channels");
          let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
          L.canvas(dataMap, App.inst.canvas);
          L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
          L.log("set-map-state", mapState, dataMap);
        });
      }  break;
      case 'join-room-request': {
        let room = data.shift();
        let redrawDialog = false;
        if(App.confirmDialog?._isShown) App.confirmDialog.hide();
        // console.log(App.confirmDialog);
        App.confirmDialog = UI.confirm(`You have been requested to join room <strong>${room}</strong>. Do you want to accept?`)
          .noDismiss()
          .emphasize()
          .positive(() => {
            App.collab.joinRoom(room, App.collab.user).then(e => {
              App.collab.broadcastEvent('join-room', room);
              UI.info(`Room ${room} joined.`).show();
              CDM.room = room;
              let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
              L.log("join-room", CDM.room, dataMap);
            });
          })
          .negative((e) => {
            // console.log(e.delegateTarget);
            // if (!redrawDialog)
            let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
            L.log("reject-join-room", CDM.room, dataMap);
            App.collab.rejectjoinRoomRequest(room, App.collab.user);
          })
          .show();
      } break;
      case 'socket-user-join-room': {
        let user = data.shift();
        let room = data.shift();
        this.showPeers(room);
        if (user.socketId == App.collab?.socket?.id) {
          Core.instance()?.cookie()?.set('userid', user?.name);
          //.then((e) => console.log(e));
          // CDM.room = room
        }
        // console.log(data, App.collab);
      } break;
      case 'user-leave-room': {
        let user = data.shift();
        let room = data.shift();
        this.showPeers(room);
      } break;
      case 'socket-user-leave-room': {
        let user = data.shift();
        let room = data.shift();
        this.showPeers(room);
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.log("leave-room", {user: user, room: CDM.room}, dataMap);
        
        delete CDM.room;
        UI.info(`You have left Room: <strong>${room.name}</strong>.`)
          .show();
      } break;
      case 'push-mapkit': {
        let mapkit = data.shift(); console.log(mapkit);
        // mapkit = {
        //   id: "mapid or kit id"
        //   mapdata: "JSON string of mapdata"
        // }
        // mapdata = {
        //   conceptMap: "... compressed ...",
        //   kit: "... compressed ..."
        //}
        if (!('id' in mapkit && 'mapdata' in mapkit)) {
          UI.error('Invalid map kit.').show();
        }
        this.session.set('mapid', mapkit?.id);
        App.collab?.setData('mapid', mapkit?.id);
        CDM.userid = App.collab.getCollabId(); // console.log(App.collab, CDM);

        // unpack and open kit on cytoscape canvas.
        let { conceptMap, kit } = this.unpackMapkit(mapkit);
        this.setKitCDM(kit, conceptMap);
        App.openKit(kit, conceptMap).then(
          (result) => {
            let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
            let data = {
              room: KitBuildCollab?.getPersonalRoom()
            }
            L.canvas(dataMap, App.inst.canvas);
            L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
            L.log('open-mapkit', data, dataMap);
          },
          (error) => UI.error(error).show()
        );
      } break;
      case 'load-collabmap': {
        let id = data.shift();
        // console.log(id);
        this.ajax.get(`mapApi/getCollabMap/${id}`).then(map => {
          // console.log(map);
          let mapkit = JSON.parse(map.data);
          let conceptMap = JSON.parse(map.cmapdata);
          let kit = JSON.parse(map.kitdata);
          this.setKitCDM(kit, conceptMap);
          // console.log(mapkit, conceptMap, kit);
          let collabMap = KitBuildUI.composeLearnerMap(mapkit.canvas, conceptMap.canvas);
          // console.log(collabMap);

          this.canvas.cy.elements().remove();
          this.canvas.cy.add(collabMap);
          this.canvas.applyElementStyle();
          this.canvas.toolbar.tools
            .get(KitBuildToolbar.CAMERA)
            .fit(null, { duration: 0 });
          KitBuildUI.showBackgroundImage(this.canvas);

          let sessid = App.getCookie(CDM.cookieid); 
          // console.log(CDM.cookieid, sessid, collabMap.sessid);

          let draftData = Object.assign({
            sessid: sessid,
            psessid: collabMap.sessid,
            collabmap: id,
            room: CDM.room
          }, map);
          delete draftData.data;
          delete draftData.cmapdata;
          delete draftData.kitdata;

          let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
          L.canvas(dataMap, App.inst.canvas);
          L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
          L.log('load-collabmap', draftData, dataMap);
          UI.info("Concept map has been loaded from saved data.").show();
        });        
      } break;
      case 'message': {
        let mData = data.shift();
        let room = data.shift();
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.canvas(dataMap, App.inst?.canvas);
        L.compare(dataMap, App.inst?.canvas, CDM.conceptMap?.canvas);
        L.log(e, {message: mData, room: room}, dataMap);
      } break;
      case 'channel-message': {
        let mData = data.shift();
        let room = data.shift();
        let id = data.shift();
        let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
        L.canvas(dataMap, App.inst.canvas);
        L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
        L.log(e, {message: mData, room: room, channelId: id}, dataMap);
      } break;
    }
  }

  showPeers(room) { // console.log(room);
    if (!room) return;
    let html = '';
    for (const user of room?.users) {
      html += `<li>`;
      html += `<a href="#" class="dropdown-item item-peer-map" data-userid="${user.name}" 
                    data-socketid="${user.socketId}">`;
      html += `<i class="bi bi-diagram-2"></i>`;
      html += `<small class="text-primary ms-2">${user.name}</small>`;
      html += `</a>`;
      html += `</li>`;
    }
    $('.peer-maps').html(html);
  }

  setKitCDM(kit, conceptMap) {
    CDM.kit = kit;
    CDM.kitId = kit.map.id;
    CDM.conceptMap = conceptMap;
    CDM.conceptMapId = kit.map.cmid;
  }

  generateMapState() {
    return new Promise((resolve, reject) => { // console.log(CDM);
      let mapState = {
        kit: CDM.kit,
        conceptMap: CDM.conceptMap,
        cyData: this.canvas.cy.elements().jsons()
      };
      resolve(mapState)
    })
  }

  applyMapState(mapState){ // console.log(mapState);
    return new Promise((resolve, reject) => {
      let kit = mapState.kit;
      let cyData = mapState.cyData;
      let conceptMap = mapState.conceptMap;
      if (!cyData) {
        console.warn('Invalid cyData: ', cyData);
        return;
      }
      if (!kit) {
        console.warn('Invalid kit: ', kit);
        return;
      }
      if (!conceptMap) {
        console.warn('Invalid conceptMap: ', conceptMap);
        return;
      }

      CDM.kit = kit;
      CDM.kitId = kit.map.id;
      CDM.conceptMapId = kit.map.cmid;
      CDM.conceptMap = conceptMap;

      this.canvas.cy.elements().remove();
      this.canvas.cy.add(cyData ? cyData : {}).unselect();
      this.canvas.applyElementStyle();
      // this.canvas.toolbar.tools.get(KitBuildToolbar.NODE_CREATE)
      //   .setActiveDirection(conceptMap.map.direction)
      this.canvas.toolbar.tools.get(KitBuildToolbar.CAMERA).fit(null, {duration: 0});
      this.canvas.toolbar.tools.get(KitBuildToolbar.UNDO_REDO).clearStacks().updateStacksStateButton();
      this.canvas.toolCanvas.clearCanvas().clearIndicatorCanvas();
      this.canvas.toolCanvas.tools
        .get(KitBuildCanvasTool.DISTANCECOLOR)
        .setConceptMap(CDM.conceptMap.canvas);
      this.canvas.cy.remove('#VIRTUAL');
      resolve(mapState);
    });
  }

}

App.canvasId = "recompose-canvas";

// App.getCookie = (name) => {
//   // const value = `; ${document.cookie}`;
//   // const parts = value.split(`; ${name}=`);
//   // if (parts.length === 2) return parts.pop().split(';').shift();
//   return "";
// }

// App.onBrowserStateChange = (event) => {
//   // console.warn(event)
//   L.log("browser-state-change", { from: event.oldState, to: event.newState });
//   if (event.newState == "terminated") {
//     let stateData = {};
//     if (App.inst && App.inst.logger)
//       stateData.logger = {
//         username: App.inst.logger.username,
//         seq: App.inst.logger.seq,
//         sessid: App.inst.logger.sessid,
//         enabled: App.inst.logger.enabled,
//       };
//     stateData.map = Core.compress(
//       App.inst.canvas.cy.elements().jsons()
//     );
//     let cmapAppStateData = JSON.stringify(Object.assign({}, stateData));
//     localStorage.setItem(App.name, cmapAppStateData);
//   }
// };

App.onCanvasEvent = (canvasId, event, data) => { 
  // console.error(canvasId, event, data, CDM);
  Logger.canvasid = canvasId;
  let skip = [ // for canvas data
    'camera-reset', 
    'camera-center', 
    'camera-fit', 
    'camera-zoom-in', 
    'camera-zoom-out'
  ];

  if (event == 'distance-feedback') {

    // console.log(App.timer, App.timer.ts, App.lastFeedback);
    // if (!App.lastFeedback) {
    //   if (App.timer.ts < App.feedbackDelay) {
    //     let timeleft = App.feedbackDelay - (App.timer.ts - (App.lastFeedback ?? 0));
    //     UI.dialog(`Feedback is not available right now. Please wait for ${timeleft} seconds`).show();
    //     return;
    //   }
    //   // App.lastFeedback = App.timer.ts;
    // } else {
    //   if (App.timer.ts - App.lastFeedback < App.feedbackDelay || App.timer.ts < App.feedbackDelay) {
    //     let timeleft = App.feedbackDelay - (App.timer.ts - App.lastFeedback);
    //     UI.dialog(`Feedback is not available right now. Please wait for ${timeleft} seconds`).show();
    //     return;
    //   }
    // }

    App.inst.feedbackNearbyDialog.nodeId = data.id;
    App.inst.feedbackNearbyDialog.nodes = [App.inst.canvas.cy.elements(`#${data.id}`)];
    App.inst.feedbackNearbyDialog.show();
    return;
  }

  let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
  if (!skip.includes(event))
    L.canvas(dataMap, App.inst.canvas);
  if (event.includes("connect"))
    L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
  L.log(event, data, dataMap);
  // console.log(event, data, dataMap);
  // forward event to collaboration interface
  App.collab?.send("command", event, data);

};

App.openKit = (kit, conceptMap) => {
  return new Promise((resolve, reject) => {
    if (!CDM.userid) reject('Invalid user ID');
    if (!kit.canvas) reject('Invalid concept map canvas data');
    if (!conceptMap.canvas) reject('Invalid concept map canvas data');
    // lmap.canvas.conceptMap = conceptMap.canvas;
    // if (!CDM.kit) {
    //   CDM.kit = {};
    //   CDM.kit.map = {};
    //   CDM.kit.map.options = {};
    //   CDM.kit.canvas = CDM.conceptMap.canvas;
    // }
  
    // console.log(CDM);
    // CDM.kit.canvas.conceptMap = CDM.conceptMap.canvas;

    // console.log(Logger);
    if (typeof Logger != undefined) Logger.userid = CDM.userid;

    let canvas = App.inst.canvas;
  
    // let cyData = KitBuildUI.composeKitMap(data.lmap ? lmap.canvas : kit.canvas);
    App.parseKitMapOptions(CDM.kit);
    let cyData = KitBuildUI.composeKitMap(kit.canvas, conceptMap.canvas);
    canvas.cy.elements().remove();
    canvas.cy.add(cyData);
    // canvas.toolbar.tools.get(KitBuildToolbar.CAMERA).fit(null, {duration: 0});
    canvas.toolbar.tools
      .get(KitBuildToolbar.NODE_CREATE)
      .setActiveDirection(CDM.conceptMap.map.direction);
    // let tool = canvas.toolCanvas.tools
    //   .get(KitBuildCanvasTool.DISTANCECOLOR)
    //   .setConceptMap(CDM.conceptMap.canvas);
    canvas.applyElementStyle();
    canvas.cy.animate(Object.assign({
      center: { eles: canvas.cy.elements() },
      fit: {
        eles: canvas.cy.elements(),
        padding: 50
      },
      // complete: () => resolve()
    }, { duration: 0 }));
    KitBuildUI.showBackgroundImage(canvas);
    CDM.options = CDM.kit.map.options;
    // let canvasJsons = canvas.cy.elements().jsons();
    // let dataMap = new Map([
    //   ['kid', CDM.kitId],
    //   ['cmid', CDM.conceptMapId],
    //   ['canvas', Core.compress(canvasJsons)]
    // ]);
    // let learnerMapData = KitBuildUI.buildConceptMapData(App.inst.canvas);
    // learnerMapData.conceptMap = CDM.conceptMap.canvas;
    // console.log(learnerMapData);
    // let result = Analyzer.composePropositions(learnerMapData);
    // console.log(result, learnerMapData);
    // let direction = CDM.conceptMap.map.direction;
    // let compare = Analyzer.compare(learnerMapData, direction);
    // console.warn(compare);
    // dataMap.set('compare', JSON.stringify(compare));  
    let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
    L.canvas(dataMap, App.inst.canvas);
    // App.inst.session.regenerateId().then(sessid => {
    //   Logger.sessid = App.getCookie(CDM.cookieid);
      Logger.seq = 1;
      L.compare(dataMap, App.inst.canvas, CDM.conceptMap.canvas);
      L.log("open-kit", CDM.kitId, dataMap);
    // });

    // Start performance measurement for this level
    if (typeof Perf != "undefined")
      Perf.start({ kid: CDM.kitId, cmid: CDM.conceptMapId });

    resolve();
  });
}

App.postOpenKit = (userid, remember = true) => {
  console.log("postOpenKit");
  // if (remember) Core.instance().cookie().set('userid', userid);
  // else App.removeCookie('userid'); // Core.instance().cookie().unset('userid');
  App.timer = new Timer('.app-navbar .timer');
  App.timer.on();
  App.lastFeedback = App.timer.ts;
  // App.inst.generateMapState().then(mapState => { 
  //   console.warn(mapState);
  //   App.collab.send("push-map-state", mapState);
  // });

  // if (App.inst.config.get('enablecollab'))
  //   App.collab?.registerUser(userid);
}

/**
 *
 * Helpers
 */

// App.uuidv4 = () => {
//   return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
//     (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
//   );
// }

// App.parseIni = (data) => {
//   var regex = {
//     section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
//     param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
//     comment: /^\s*;.*$/
//   };
//   var value = {};
//   var lines = data.split(/[\r\n]+/);
//   var section = null;
//   lines.forEach(function(line){
//     if(regex.comment.test(line)){
//       return;
//     }else if(regex.param.test(line)){
//       var match = line.match(regex.param);
//       if(section){
//         value[section][match[1]] = match[2];
//       }else{
//         value[match[1]] = match[2];
//       }
//     }else if(regex.section.test(line)){
//       var match = line.match(regex.section);
//       value[match[1]] = {};
//       section = match[1];
//     }else if(line.length == 0 && section){
//       section = null;
//     };
//   });
//   return value;
// }

App.parseKitMapOptions = (kit) => { 
  // console.log(kit);
  if (!kit) return;
  // console.error(kit, kit.map.options);
  kit.parsedOptions = App.parseOptions(kit.map.options, {
    layout: "preset",
    feedbacklevel: 2,
    fullfeedback: 1,
    modification: 1,
    readcontent: 1,
    saveload: 1,
    reset: 1,
    feedbacksave: 1,
    countfb: 0,
    countsubmit: 0,
    log: 0,
  });
  // console.log(kit);
};

// App.resetMapToKit = (kit, canvas) => {
//   return new Promise((resolve, reject) => {
//     // will also set and cache the concept map
//     // App.inst.setKitMap(kit);
//     canvas.cy.elements().remove();
//     canvas.cy.add(KitBuildUI.composeKitMap(kit.canvas));
//     canvas.applyElementStyle();
//     canvas.toolbar.tools
//         .get(KitBuildToolbar.NODE_CREATE)
//         .setActiveDirection(CDM.conceptMap.map.direction);
//     canvas.applyElementStyle();
//     console.warn(kit);
//     if (kit.map.layout == "random") {
//       canvas.cy
//         .elements()
//         .layout({
//           name: "fcose",
//           animationDuration: 0,
//           fit: false,
//           stop: () => {
//             canvas.toolbar.tools
//               .get(KitBuildToolbar.CAMERA)
//               .center(null, { duration: 0 });
//             resolve(true);
//           },
//         })
//         .run();
//     } else {
//       canvas.toolbar.tools
//         .get(KitBuildToolbar.CAMERA)
//         .fit(null, { duration: 0 });
//       resolve(true);
//     }
//     KitBuildUI.showBackgroundImage(canvas);
//     resolve(true);

//     // TODO: apply kit options to UI
//     // console.log(kit)

//     // let feedbacklevelFeature =
//     //   '<button class="bt-feedback btn btn-warning"><i class="bi bi-eye-fill"></i> Feedback <span class="count"></span></button>';
//     // feedbacklevelFeature +=
//     //   '<button class="bt-clear-feedback btn btn-warning"><i class="bi bi-eye-slash-fill"></i> Clear Feedback</button>';
//     // let saveloadFeature =
//     //   '<button class="bt-save btn btn-secondary"><i class="bi bi-download"></i> Save</button>';
//     // saveloadFeature +=
//     //   '<button class="bt-load btn btn-secondary"><i class="bi bi-upload"></i> Load</button>';
//     // let readcontentFeature =
//     //   '<button class="bt-content btn btn-sm btn-secondary"><i class="bi bi-file-text-fill"></i> Contents</button>';
//     // let resetFeature =
//     //   '<button class="bt-reset btn btn-danger"><i class="bi bi-arrow-counterclockwise"></i> Reset</button>';

//     // if (kit.parsedOptions.feedbacklevel)
//     //   $("#recompose-feedbacklevel")
//     //     .html(feedbacklevelFeature)
//     //     .removeClass("d-none");
//     // else $("#recompose-feedbacklevel").html("").addClass("d-none");
//     // if (kit.parsedOptions.saveload)
//     //   $("#recompose-saveload").html(saveloadFeature).removeClass("d-none");
//     // else $("#recompose-saveload").html("").addClass("d-none");
//     // if (kit.parsedOptions.reset)
//     //   $("#recompose-reset").html(resetFeature).removeClass("d-none");
//     // else $("#recompose-reset").html("").addClass("d-none");
//     // if (kit.parsedOptions.readcontent)
//     //   $("#recompose-readcontent")
//     //     .html(readcontentFeature)
//     //     .removeClass("d-none");
//     // else $("#recompose-readcontent").html("").addClass("d-none");
//     // return;
//   });
// };

App.parseOptions = (options, defaultValueIfNull) => {
  if (options === null || options === undefined) return defaultValueIfNull;
  let option,
    defopt = defaultValueIfNull;
  try {
    option = Object.assign({}, defopt, options);
    option.feedbacklevel = option.feedbacklevel
      ? parseInt(option.feedbacklevel)
      : defopt.feedbacklevel;
  } catch (error) {
    UI.error(error).show();
  }
  return option;
};

// App.getCookie = (name) => {
//   let value = Core.instance().cookie().getCookie(name);
//   return value;
// }
// App.removeCookie = async (name) => {
//   const status = await Core.instance().cookie().unset(name);
//   console.warn("Removing cookie:", name, App.getCookie(name));
// }

App.duration = (seconds) => {
  let d = Number(seconds);
  if (d <= 0) return '00:00:00';
  else {
    let h = Math.floor(d / 3600);
    let m = Math.floor(d % 3600 / 60);
    let s = Math.floor(d % 3600 % 60);
    let hDisplay = h == 0 ? null : (h <= 9 ? '0'+h+'°' : h+'°');
    let mDisplay = m == 0 ? null : (m <= 9 ? '0'+m+'\'' : m+'\'');
    let sDisplay = s == s <= 9 ? '0'+s : s;
    return `${hDisplay ?? ""}${mDisplay ?? ""}${sDisplay}"`; 
  }
}

App.time = (seconds) => {
  let d = Number(seconds);
  if (d <= 0) return '00:00:00';
  else {
    let h = Math.floor(d / 3600);
    let m = Math.floor(d % 3600 / 60);
    let s = Math.floor(d % 3600 % 60);
    let hDisplay = h <= 9 ? '0'+h : h;
    let mDisplay = m <= 9 ? '0'+m : m;
    let sDisplay = s <= 9 ? '0'+s : s;
    return `${hDisplay}:${mDisplay}:${sDisplay}`; 
  }
}

// App.download = (filename, text) => {
//   var element = document.createElement('a');
//   element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
//   element.setAttribute('download', filename);
//   element.style.display = 'none';
//   document.body.appendChild(element);
//   element.click();
//   document.body.removeChild(element);
// }

// App.enableNavbarButton = (enabled = true) => {
//   $("#recompose-readcontent button").prop("disabled", !enabled);
//   $("#recompose-saveload button").prop("disabled", !enabled);
//   $("#recompose-reset button").prop("disabled", !enabled);
//   $("#recompose-feedbacklevel button").prop("disabled", !enabled);
//   $(".bt-submit").prop("disabled", !enabled);
//   $(".bt-open-kit").prop("disabled", !enabled);
//   App.inst.canvas.toolbar.tools.forEach((tool) => {
//     tool.enable(enabled);
//   });
// };

// class AutoFeedback {

//   handler;
//   appCanvas;
//   static inst;
//   static delay = 30000;

//   constructor(appCanvas) {
//     // console.log(appCanvas);
//     this.appCanvas = appCanvas;
//     this.handler = setInterval(() => {
//       this.compare();
//     }, AutoFeedback.delay);
//   }

//   compare() {
//     // console.log(this, CDM.conceptMap);
//     let learnerMapData = KitBuildUI.buildConceptMapData(this.appCanvas);
//     learnerMapData.conceptMap = CDM?.conceptMap?.canvas;
//     // console.log(learnerMapData, this.appCanvas.cy.edges('[type="right"]'));
//     Analyzer.composePropositions(learnerMapData);

//     if (!CDM?.conceptMap) {
//       console.warn("Compare:", "Invalid conceptMap."); 
//       return;
//     }
//     if (!CDM?.conceptMap?.map) {
//       console.warn("Compare:", "Invalid conceptMap CDM.");
//       return;
//     }

//     let direction = CDM.conceptMap.map.direction;
//     let compare = Analyzer.compare(learnerMapData, direction);
//     console.log(compare);
//     this.appCanvas.cy.edges().removeClass('match');
//     compare?.match.forEach(m => {
//       this.appCanvas.cy.edges(`[source="${m.lid}"][target="${m.tid}"]`).addClass('match');
//     });
//     $('.fb-ma').html(compare.match.length);
//     $('.fb-mi').html(compare.miss.length);
//     $('.fb-ex').html(compare.excess.length);
//     $('.fb-sc').html(parseInt(compare.score * 100) + '%');
        
//     let dataMap = L.dataMap(CDM.kitId, CDM.conceptMapId, CDM.room);
//     L.canvas(dataMap, this.appCanvas); 
//     L.compare(dataMap, this.appCanvas, CDM.conceptMap.canvas);
//     L.log("auto-feedback", CDM.kitId, dataMap);
//     // console.warn(compare);
//     // dataMap.set('compare', JSON.stringify(compare));
//     // dataMap.set('nmatch', compare.match.length);
//     // dataMap.set('nmiss', compare.miss.length);
//     // dataMap.set('nexcess', compare.excess.length);
//     return compare; 
//   }

//   static instance(app) {
//     if (!AutoFeedback.inst) AutoFeedback.inst = new AutoFeedback(app);
//     return AutoFeedback.inst;
//   }

// }