function Slot(selects) {
	var rnd = Math.random() * selects.reduce(function(w, o) {return w + o.weight}, 0);
	var progress = 0;
	for (var i = 0;; i++) {
		progress += selects[i].weight;
		if (progress >= rnd) {
			if (typeof selects[i].target === "function") {
				return selects[i].target();
			}
			return selects[i].target;
		}
	}
}
