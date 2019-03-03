
import {init, run} from "w3g/main";

import {LoadingScene, initialLoads, setupLoaders} from "./loading";
import TitleScene from "./title";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

window.onload = async function() {
	const canvas = await init();

	document.body.appendChild(canvas);

	setupLoaders();

	LoadingScene.createAndEnter(initialLoads, TitleScene);

	run();
};
