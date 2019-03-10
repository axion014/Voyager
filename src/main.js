
import {init, run} from "w3g/main";

import {LoadingScene, initialLoads, setupLoaders} from "./loading";
import TitleScene from "./title";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

window.onload = async function() {
	const canvas = init();

	setupLoaders();

	LoadingScene.createAndEnter(initialLoads, TitleScene);

	document.body.appendChild(await canvas);

	run();
};
