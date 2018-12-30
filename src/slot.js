export function Slot(selects) {
	const weightProgress = selects.reduce((a, b) => {
		a.push(a[a.length - 1] + typeof b.weight === "function" ? b.weight() : b.weight);
		return a;
	}, [0]);
	weightProgress.shift();
 	const rnd = Math.random() * weightProgress[weightProgress.length - 1];
	for (let i = 0;; i++) {
		if (weightProgress[i] >= rnd) {
			if (typeof selects[i].target === "function") {
				return selects[i].target();
			}
			return selects[i].target;
		}
	}
	throw new Error();
}
