// Fluid Builder — app.js
// CSS clamp() fluid typography & spacing generator

$(function () {

  // ─── DOM references ───────────────────────────────────────────────────────
  let listEl          = $("[data-group='list']");
  let templateEl      = $("[data-template='true']");
  let contentMaxField = $("[data-field='content-max']");
  let contentMinField = $("[data-field='content-min']");
  let containerMaxField = $("[data-field='container-max']");
  let fallbackWrap    = $(".fallback_wrap");

  // ─── State ────────────────────────────────────────────────────────────────
  let contentMax   = 70;
  let contentMin   = 30;
  let maxScreenSize = contentMax;
  let url          = "";
  let supports     = true;

  // ─── CodeMirror editor ────────────────────────────────────────────────────
  let editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    mode: "htmlmixed",
    lineNumbers: false,
    lineWrapping: true,
    readOnly: true,
  });

  // ─── Core calculation ─────────────────────────────────────────────────────
  function getSizes(minSize, maxSize) {
    let slope      = (maxSize - minSize) / (contentMax - contentMin);
    slope          = parseFloat(slope.toFixed(4));
    let maxFontSize = maxSize + slope * (maxScreenSize - contentMax);
    maxFontSize    = parseFloat(maxFontSize.toFixed(4));
    let rem        = minSize - slope * contentMin;
    rem            = parseFloat(rem.toFixed(4));
    let vw         = slope * 100;
    vw             = parseFloat(vw.toFixed(4));

    let accessible = maxFontSize <= 2.5 * minSize;
    let shrinks    = rem <= 0;

    let clampString;
    if (minSize <= maxFontSize) {
      clampString = `clamp(${minSize}rem, ${rem}rem + ${vw}vw, ${maxFontSize}rem);`;
    } else {
      clampString = `clamp(${maxFontSize}rem, ${rem}rem + ${vw}vw, ${minSize}rem);`;
    }
    return [clampString, accessible, shrinks];
  }

  // ─── Scale group calculation ───────────────────────────────────────────────
  function updateScaleGroups() {
    $("[data-group-scale='true']").each(function () {
      let items    = $(this).find("[data-item]");
      let mainItem = items.filter(".is-main").attr("data-index", "0");
      if (!mainItem.length) {
        mainItem = items.first().addClass("is-main").attr("data-index", "0");
      }
      let maxScale = +$(this).find("[data-field='max-scale']").val();
      let minScale = +$(this).find("[data-field='min-scale']").val();
      let maxSize  = +mainItem.find("[data-field='max']").val();
      let minSize  = +mainItem.find("[data-field='min']").val();
      let zeroIndex = mainItem.index();
      items.each(function (index) {
        if (!$(this).hasClass("is-main")) {
          let dataIndex     = (index - zeroIndex) * -1;
          let scaledMaxSize = maxSize * Math.pow(maxScale, dataIndex);
          let scaledMinSize = minSize * Math.pow(minScale, dataIndex);
          $(this).find("[data-field='max']").val(scaledMaxSize.toFixed(2));
          $(this).find("[data-field='min']").val(scaledMinSize.toFixed(2));
        }
      });
    });
  }

  // ─── Main update ──────────────────────────────────────────────────────────
  function updateEverything() {
    contentMax    = +contentMaxField.val();
    contentMin    = +contentMinField.val();
    maxScreenSize = +containerMaxField.val();

    updateScaleGroups();

    url = `?design=${contentMax}&max=${maxScreenSize}&min=${contentMin}`;
    if (!supports) url += "&f";

    let fallbackLargeString = "";
    let fallbackSmallString = "";
    let clampString         = "";

    $("[data-group='wrap']").each(function () {
      if (!$(this).find("[data-item]").length) return;

      url += "&g=";
      if ($(this).attr("data-group-scale") === "true") {
        url += `:${$(this).find("[data-field='max-scale']").val()},${$(this).find("[data-field='min-scale']").val()}:`;
      }

      $(this).find("[data-item]").each(function () {
        let variableName = $(this).find("[data-field='variable-name']").val();
        let max = parseFloat($(this).find("[data-field='max']").val());
        let min = parseFloat($(this).find("[data-field='min']").val());

        $(this).find("[data-bar='max']").css("width", max + "rem");
        $(this).find("[data-bar='min']").css("width", min + "rem");

        let main = $(this).hasClass("is-main") ? ",t" : "";
        url += `${variableName},${max},${min}${main}_`;

        let fluidData  = getSizes(min, max);
        let clamp      = fluidData[0];
        let accessible = fluidData[1];
        let shrinks    = fluidData[2];

        $(this).removeClass("accessibility-warning is-secondary");
        if (!accessible) {
          $(this).addClass("accessibility-warning");
        } else if (shrinks) {
          $(this).addClass("accessibility-warning is-secondary");
        }

        if (variableName !== "") {
          fallbackLargeString += `\n\t${variableName}: ${max}rem;`;
          fallbackSmallString += `\n\t\t${variableName}: ${min}rem;`;
          clampString         += `\n\t${variableName}: ${clamp}`;
        }
      });

      if (url.endsWith("_")) url = url.slice(0, -1);
    });

    // Build CSS output
    let codeString = `<style>`;
    codeString += `\n/* ${window.location.origin + window.location.pathname + url} */\n`;

    if (supports) {
      codeString += `\n/* fallback for older browsers */`;
      codeString += `\n:root {${fallbackLargeString}\n}`;
      codeString += `\n@media screen and (max-width: 767px) {\n\t:root {${fallbackSmallString}\n\t}\n}`;
      codeString += `\n\n/* fluid sizes */`;
      codeString += `\n@supports (font-size: clamp(1rem, 0.5rem + 3vw, 3rem)) {`;
    }

    codeString += `\n:root {${clampString}\n}`;
    if (supports) codeString += `\n}`;
    codeString += `\n</style>`;

    editor.getDoc().setValue(codeString);
    window.history.replaceState({}, "", url);
  }

  // ─── Clone template ───────────────────────────────────────────────────────
  function addCloneTo(list) {
    let clone = templateEl.clone().attr("data-template", "false");
    clone.find("[data-field='variable-name']").val("--variable-name");
    clone.find("[data-field='max']").val("8");
    clone.find("[data-field='min']").val("4");
    clone.appendTo(list);
    return clone;
  }

  // ─── Load from URL ────────────────────────────────────────────────────────
  url = window.location.search;
  if (!url.length) {
    url = "?design=90&max=90&min=20&f" +
      "&g=--site--margin,3,1" +
      "&g=:1.39,1.26:--_typography---font-size--display,7.21,4_--_typography---font-size--h1,5.19,3.18_--_typography---font-size--h2,3.73,2.52_--_typography---font-size--h3,2.69,2_--_typography---font-size--h4,1.93,1.59_--_typography---font-size--h5,1.39,1.26_--_typography---font-size--h6,1,1,t" +
      "&g=:1.2,1.14:--_typography---font-size--text-large,1.26,1.14_--_typography---font-size--text-main,1.05,1_--_typography---font-size--text-small,0.875,0.875,t" +
      "&g=:1.49,1.4:--_spacing---section-space--large,13.48,7.23_--_spacing---section-space--main,9.05,5.17_--_spacing---section-space--small,6.07,3.69_--_spacing---space--8,4.08,2.64_--_spacing---space--7,2.74,1.88_--_spacing---space--6,1.84,1.34_--_spacing---space--5,1.23,0.96_--_spacing---space--4,0.83,0.69_--_spacing---space--3,0.56,0.49_--_spacing---space--2,0.37,0.35_--_spacing---space--1,0.25,0.25,t";
  }

  const params = new URLSearchParams(url);
  let g = 0;
  params.forEach((value, key) => {
    if (key === "f") {
      supports = false;
      fallbackWrap.removeClass("is-active");
    }
    if (key === "g") {
      let myString = value;
      if (myString.startsWith(":")) {
        let textBetweenColons = myString.substring(
          myString.indexOf(":") + 1,
          myString.lastIndexOf(":")
        );
        myString = myString.replace(":" + textBetweenColons + ":", "");
        $("[data-group='wrap']").eq(g).find("[data-field='max-scale']").val(textBetweenColons.split(",")[0]);
        $("[data-group='wrap']").eq(g).find("[data-field='min-scale']").val(textBetweenColons.split(",")[1]);
      }
      myString.split(/(?<!-)_/).forEach((item) => {
        let itemEl = addCloneTo(listEl.eq(g));
        let values = item.split(",");
        itemEl.find("[data-field='variable-name']").val(values[0]);
        itemEl.find("[data-field='max']").val(values[1]);
        itemEl.find("[data-field='min']").val(values[2]);
        if (values[3] === "t") itemEl.addClass("is-main");
      });
      g++;
    }
    if (key === "design") contentMaxField.val(value);
    if (key === "max")    containerMaxField.val(value);
    if (key === "min")    contentMinField.val(value);
  });

  updateEverything();
  updateEverything();
  updateEverything();

  // ─── Event handlers ───────────────────────────────────────────────────────

  // Input change
  $(document).on("input", "input", function () {
    if ($(this).attr("type") === "number") {
      $(this).closest("[data-group='list']").children().removeClass("is-main");
      $(this).closest("[data-item]").addClass("is-main");
    }
    updateEverything();
    updateEverything();
  });

  // Delete variable
  $(document).on("click", "[data-delete]", function () {
    $(this).closest("[data-item]").remove();
    updateEverything();
    updateEverything();
  });

  // Add variable + sortable per group
  $("[data-group='wrap']").each(function () {
    let childList = $(this).find("[data-group='list']");
    childList.sortable({
      stop: function () {
        updateEverything();
        updateEverything();
      },
    });
    $(this).find("[data-add-variable]").on("click", function () {
      addCloneTo(childList);
      updateEverything();
      updateEverything();
    });
  });

  // Browser fallback toggle
  fallbackWrap.on("click", function () {
    supports = !supports;
    $(this).toggleClass("is-active");
    updateEverything();
    updateEverything();
  });

  // Disable scroll-on-number-input
  document.addEventListener("wheel", function () {
    if (document.activeElement.type === "number") {
      document.activeElement.blur();
    }
  });

  // Copy generated CSS
  $("[data-copy]").on("click", function () {
    navigator.clipboard.writeText(editor.getValue()).then(() => {
      let btn = $(this).find(".btn_text");
      let orig = btn.text();
      btn.text("Copied!");
      setTimeout(() => btn.text(orig), 1500);
    }).catch(() => {
      // fallback
      let tmp = $("<textarea>").css({ position: "fixed", opacity: 0 });
      $("body").append(tmp);
      tmp.val(editor.getValue()).select();
      document.execCommand("copy");
      tmp.remove();
    });
  });

  // Share URL (copy current URL to clipboard)
  $("[data-share]").on("click", function () {
    navigator.clipboard.writeText(window.location.href).then(() => {
      let btn = $(this).find(".btn_text");
      let orig = btn.text();
      btn.text("Copied!");
      setTimeout(() => btn.text(orig), 1500);
    });
  });

  // Reset to defaults
  $("[data-reset]").on("click", function () {
    window.location.search = "";
  });

});
