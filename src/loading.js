
import Scene from "w3g/scene";
import {createLabel} from "w3g/uielements";
import Easing from "w3g/easing";
import {setupLoader} from "w3g/loading";

export const initialLoads = {
	THREE_Model_JSON: {
		fighter: 'data/models/fighter-1.min.json',
		bullet: 'data/models/bullet-lq.min.json',
		enem1: 'data/models/enem-1.min.json',
		airballoon: 'data/models/airballoon.min.json',
	},
	THREE_Texture: {
		//fighter: 'data/models/fighter-1.png',
		plane: 'data/images/3.png',
		explode: 'data/images/explosion.png'
	},
	GLSL: {
		expvertex: 'data/glsl/expvertexshader.min.glsl',
		expfrag: 'data/glsl/expfragshader.min.glsl',
		glowvertex: 'data/glsl/glowvertexshader.min.glsl',
		glowfrag: 'data/glsl/glowfragshader.min.glsl',
		noisyglowvertex: 'data/glsl/noisyglowvertexshader.min.glsl'
	}
};

export class LoadingScene extends Scene {

	label = createLabel("Loading... 0%", {
		font: "20px 'HiraKakuProN-W3'",
		fillStyle: '#444a',
	});

	constructor(list, nextScene, ...nextSceneArguments) {
		super();
		this.UIScene.add(this.label);
		const loader = setupLoader(list);
		loader.onProgress.add(() => {
  		this.label.text = "Loading... " + Math.round(loader.progress) + "%";
		});
		loader.load(() => {
  		console.log('Load complete');
			this.addEasing(
				new Easing(this.label)
					.add({opacity: 0}, 200, Easing.LINEAR)
					.trigger(nextScene.createAndEnter(...nextSceneArguments))
			);
		});
	}
}
