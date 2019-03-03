import {Label} from "w3g/uielements";
import Scene from "w3g/scene";

import {textAlign} from "three-text2d";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

export default class SceneLoadingScene extends Scene {

	_loading_label = new Label(' ', {
		align: textAlign.center,
		fillStyle: 'hsla(0, 0%, 0%, 0.6)',
		font: "20px 'HiraKakuProN-W3'"
	});

	constructor(sceneToLoad, ...parallel) {
		super();
		this.UIScene.add(this._loading_label);

		const load = async parallel => {
			this._loadprogress = 0;
			this._loadfrequency = 0;
			for(let i = 0; i < parallel.length; i++) {
				if (Array.isArray(parallel[i])) for(let j = 0; j < parallel[i].length; j++) this._loadfrequency++;
				else this._loadfrequency++;
			}
			this._loading_label.text = 'Loading... 0/' + this._loadfrequency;
			for(let i = 0; i < parallel.length; i++) {
				const resolve = () => {
					this._loading_label.text = 'Loading... ' + ++this._loadprogress + '/' + this._loadfrequency;
					if (this._loadprogress === this._loadfrequency) this.UIScene.remove(this._loading_label);
				};
				if (Array.isArray(parallel[i])) {
					const promises = [];
					for(let j = 0; j < parallel[i].length; j++) {
						const promise = parallel[i][j].call(sceneToLoad);
						if (promise) promise.then(resolve);
						else resolve();
						if (promise) promises.push(promise);
					}
					await Promise.all(promises);
				} else {
					const promise = parallel[i].call(sceneToLoad);
					if (promise) await promise;
					resolve();
				}
			}
			sceneToLoad.enterThisScene();
		};
		load(parallel);
	}
}
