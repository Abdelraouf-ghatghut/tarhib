// Anti-FOUC : pose le thème avant le premier rendu (localStorage sinon système)
(function () {
  try {
    var stored = localStorage.getItem("tarhib_theme");
    var mode =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = mode;
  } catch (e) {
    /* défaut light */
  }
})();
