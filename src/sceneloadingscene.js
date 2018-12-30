import {createLabel} from "w3g/uielements";
import Scene from "w3g/scene";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

export default class SceneLoadingScene extends Scene {

	_loading_label = createLabel(' ', {
		align: textAlign.center,
		fillStyle: 'hsla(0, 0%, 0%, 0.6)',
		font: "20px 'HiraKakuProN-W3'"
	});

	constructor() {
		super();
		this.threeScene.add(this._loading_label);
	}

	async load(params) {
		this._loadprogress = 0;
		this._loadfrequency = 0;
		for(let i = 0; i < params.length; i++) for(let j = 0; j < params[i].length; j++) this._loadfrequency++;
		this._loading_label.text = 'Loading... 0/' + this._loadfrequency;
		for(let i = 0; i < params.length; i++) {
			const promises = [];
			for(let j = 0; j < params[i].length; j++) {
				const promise = new Promise(params[i][j]);
				promise.then(() => {
					this._loading_label.text = 'Loading... ' + ++this._loadprogress + '/' + this._loadfrequency;
					if (this._loadprogress === this._loadfrequency) this.threeScene.remove(this._loading_label);
				});
				promises.push(promise);
			}
			await Promise.all(promises);
		}
	}
}
