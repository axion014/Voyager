
import {Vector3, Vector2, Quaternion, Color} from "three";

import Scene from "w3g/scene";
import {Label} from "w3g/uielements";
import Easing from "w3g/easing";
import {loadResources, countResources, fileParsers, addFile} from "w3g/loading";
import {get, free} from "w3g/utils";
import {rotate} from "w3g/threeutil";

import FadeShader from "w3g/three-effect/FadeShader";
import ZoomblurShader from "w3g/three-effect/ZoomblurShader";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

import TitleScene from "./title";
import {PLAYER} from "./constants";
import "./units";

addFile('GLSL', 'glowFragment', "data/glsl/glowfrag.min.glsl");

export const initialLoads = [FadeShader, ZoomblurShader, TitleScene, {
	THREE_Model_GLTF: localStorage.getItem(PLAYER) || "player1"
}];

export class LoadingScene extends Scene {

	label = new Label("Loading... 0%", {
		font: "20px 'HiraKakuProN-W3'",
		fillStyle: '#444a',
	});

	constructor(list, nextScene, ...nextSceneArguments) {
		super();
		this.UIScene.add(this.label);
		this.nextScene = nextScene;
		this.nextSceneArguments = nextSceneArguments;
		this.load(list);
	}

	async load(list) {
		const totalResources = countResources(list);

		let loadedResources = 0;
		await loadResources(list, () => {
			loadedResources++;
			this.label.text =	`Loading... ${loadedResources} / ${totalResources} (${Math.round(loadedResources / totalResources * 100)}%)`;
		});

		this.onComplete();
	}

	onComplete() {
		console.log('Load complete');
		this.addEasing(
			new Easing(this.label)
				.add({opacity: 0}, 200, Easing.LINEAR)
				.trigger(() => this.nextScene.createAndEnter(...this.nextSceneArguments))
		);
	}
}

export function setupLoaders() {
	fileParsers.STAGE = async response => {
		return (function recurse(obj, defaults) {
			if (typeof defaults === "function") return defaults(obj !== undefined ? obj : {});
			if (Array.isArray(defaults)) {
				if (Array.isArray(obj)) obj.map(element => recurse(element, defaults[0]));
				else return [];
			} else if (typeof defaults === 'object') {
				obj = obj || {};
				Object.keys(defaults).forEach(key => obj[key] = recurse(obj[key], defaults[key]));
			}
			return obj !== undefined ? obj : defaults;
		})(await response.json(), {
			enemies: [
				{
					position: obj => new Vector3(obj.x || 0, obj.y || 0, obj.z || 0),
					rotation: obj => {
						obj.a = obj.a || {};
						const axis = get(Vector3).set(obj.a.x || 0, obj.a.y || 0, obj.a.z || 0);
						const quaternion = rotate(new Quaternion(), axis, obj.r || 0);
						free(axis);
						return quaternion;
					},
					option: {},
					autospawn: {
						time: 0, progress: 0,
						random: obj => new Vector3(obj.x || 0, obj.y || 0, obj.z || 0)
					},
					killmes: {time: 0, text: '', offkill: false}
				}
			],
			obstacles: [
				{
					position: obj => new Vector3(obj.x || 0, obj.y || 0, obj.z || 0),
					rotation: obj => {
						obj.a = obj.a || {};
						const axis = get(Vector3).set(obj.a.x || 0, obj.a.y || 0, obj.a.z || 0);
						const quaternion = rotate(new Quaternion(), axis, obj.r || 0);
						free(axis);
						return quaternion;
					},
					scale: obj => new Vector3(obj.x || 100, obj.y || 100, obj.z || 100)
				}
			],
			winds: [
				{
					position: obj => new Vector2(obj.x || 0, obj.y || 0),
					v: 0.2, color: obj => new Color(obj)
				}
			],
			messages: [{time: 0, text: ''}],
			goals: [
				{
					position: obj => new Vector3(obj.x || 0, obj.y || 0, obj.z || 0),
					size: 100, kill: 0, message: ''
				}
			]
		});
	};
}
