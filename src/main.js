
import {init, run} from "w3g/main";

import {LoadingScene, initialLoads} from "./loading";
import TitleScene from "./title";

window.onload = function() {
	init();

	LoadingScene.createAndEnter(initialLoads, TitleScene);

	run();
};
