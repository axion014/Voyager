import {
	DirectionalLight, AmbientLight, FogExp2,
	Mesh, Group,
	CircleBufferGeometry,
	MeshBasicMaterial,
	Vector3, Vector2, Quaternion
} from "three";

import ShaderPass from "w3g/three-effect/ShaderPass";
import FadeShader from "w3g/three-effect/FadeShader";
import ZoomblurShader from "w3g/three-effect/ZoomblurShader";

import {hitTestEllipse} from 'w3g/hittest';
import * as THREE_Utils from "w3g/threeutil";
import Scene from "w3g/scene";
import assets from "w3g/loading";
import {vw, vh, threeComposer} from "w3g/main";
import {Rectangle, Ellipse} from "w3g/geometries";
import {Label, LabelArea} from "w3g/uielements";
import Easing from "w3g/easing";
import {get, free} from "w3g/utils";

import {byID, byPlace} from "./skills";
import MainScene from "./mainscene";
import {Mark} from "./geometries";
import {units} from "./units";
import {PLAYER, SKILLS} from "./constants";

const BASE_Z = 100;

export default class TitleScene extends Scene {

	labels = [];
	points = [];
	slots = [];
	time = 0;

	constructor() {
		super();
		let currentPlayer = localStorage.getItem(PLAYER) || "player1";
		let playerModel = assets.THREE_Model_GLTF[currentPlayer].clone();
		const currentSkills = JSON.parse(localStorage.getItem(SKILLS)) || [
			{name: 'Railgun', level: 0},
			{name: 'Empty', level: 0},
			{name: 'Empty', level: 0},
			{name: 'BladeMinion', level: 0},
			{name: 'Reinforce', level: 2},
			{name: 'SelfRepair', level: 0}
		];
		let shipCost = 0;
		let selectedStage;
		let selectedDifficulty = "normal";
		const start = () => {
			const fade = new ShaderPass(new FadeShader());
			fade.uniforms.color.value.set(1, 1, 1, 0);
			this.threePasses.push(fade);
			const zoomblur = new ShaderPass(new ZoomblurShader());
			this.threePasses.push(zoomblur);

			this.addEasing(new Easing(fade.uniforms.color.value).add({w: 1}, 1250, Easing.LINEAR));
			this.addEasing(
				new Easing(zoomblur.uniforms.strength).add({value: 16}, 1250, Easing.LINEAR).trigger(() => {
					for (let i = 0; i < currentSkills.length; i++) {
						currentSkills[i].position = this.slots[i].position;
						currentSkills[i].mirror = this.slots[i].mirror;
					}
					MainScene.createAndEnter(currentSkills, selectedStage, selectedDifficulty);
				}
			));
		};
		const updateShipCostLabel = () => {
			this.shipCostLabel.text = `Cost: ${shipCost}/${units[currentPlayer].maxCost}`;
		}
		const menu = {
			title: {
				x: 0, y: 0, sub: [
					{type: 'label', value: 'Voyager', y: 15, size: 3.6},
					{type: 'label', value: 'Click to start', y: -15, size: 1.8},
					{type: 'model', name: 'player', value: playerModel, x: 0, y: 0, z: -50},
					{
						type: 'model', value: new Mesh(
							new CircleBufferGeometry(10000, 100),
							new MeshBasicMaterial({map: assets.THREE_Texture.plane})
						), x: 0, y: 1000, z: 0, init: model => model.rotateX(-Math.PI / 2)
					}
				]
			},
			main: {
				x: 50, y: -50, sub: [
					{type: 'label', value: 'Main Menu', y: 14, size: 3.6},
					{type: 'label', value: 'Campaign', y: 8, size: 1.8, link: 'difficulty'},
					{type: 'label', value: 'Stage Select', y: 4, size: 1.8, link: 'stageselect'},
					{type: 'label', value: 'Ship Select', size: 1.8, link: 'shipselect'},
					{
						type: 'label', value: 'Free Play', y: -4, size: 1.8, link: 'difficulty',
						callback: () => selectedStage = 'arcade'
					},
					{type: 'label', value: 'How to play', y: -8, size: 1.8, link: 'help'},
					{type: 'label', value: 'Settings', y: -12, size: 1.8, link: 'setting'},
					{type: 'label', value: 'Credit', x: 8, y: -18, size: 1.5, link: 'credit'},
					{type: 'label', value: 'Back', y: -16, size: 1.8, link: 'title'}
				]
			},
			help: {
				x: -60, y: 55, sub: [
					{type: 'label', value: 'How to play', y: 14, size: 3.6},
					{type: 'label', value: 'Your airplane moves automatically', y: -1, size: 0.8},
					{type: 'label', value: 'to direction of your mouse pointer', y: -2, size: 0.8},
					{type: 'label', value: '>', x: 12, size: 2.5, link: 'help2'},
					{type: 'label', value: '(1/5)', y: -3, size: 0.8},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'}
				]
			},
			help2: {
				x: 0, y: 55, sub: [
					{type: 'label', value: 'Speed-up by pressing your left mouse button', y: -1, size: 0.8},
					{type: 'label', value: '<', x: -12, size: 2.5, link: 'help'},
					{type: 'label', value: '>', x: 12, size: 2.5, link: 'help3'},
					{type: 'label', value: '(2/5)', y: -3, size: 0.8},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'}
				]
			},
			help3: {
				x: 60, y: 55, sub: [
					{type: 'label', value: 'Press W/S key to up/down vertically', y: -1, size: 0.8},
					{type: 'label', value: '(any key in this help is default key bind)', y: -2, size: 0.8},
					{type: 'label', value: '<', x: -12, size: 2.5, link: 'help2'},
					{type: 'label', value: '>', x: 12, size: 2.5, link: 'help4'},
					{type: 'label', value: '(3/5)', y: -3, size: 0.8},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'}
				]
			},
			help4: {
				x: 120, y: 55, sub: [
					{type: 'label', value: 'Press space key to attack', y: -1, size: 0.8},
					{type: 'label', value: '<', x: -12, size: 2.5, link: 'help3'},
					{type: 'label', value: '>', x: 12, size: 2.5, link: 'help5'},
					{type: 'label', value: '(4/5)', y: -3, size: 0.8},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'}
				]
			},
			help5: {
				x: 180, y: 55, sub: [
					{type: 'label', value: 'Press A/D key and Shift key to use up to 4 skills', y: -1, size: 0.8},
					{type: 'label', value: '<', x: -12, size: 2.5, link: 'help4'},
					{type: 'label', value: '(5/5)', y: -3, size: 0.8},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'}
				]
			},
			stageselect: {
				x: -72, y: -25, sub: [
					{type: 'label', value: 'Stage Select', y: 14, size: 2.5},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'},
					{
						type: 'model', value: assets.THREE_Model_GLTF.airballoon.clone(),
						x: 0, y: 0, z: 0,
						init: model => model.rotateOnAxis(new Vector3(1, -1, -1).normalize(), 1)
					},
				]
			},
			shipselect: {
				x: 0, y: 0, z: -20, sub: [
					{type: 'label', value: 'Ship Select', y: 14, size: 3.6},
					{type: 'label', value: '(You cannot select ship in this version)', y: -4, size: 0.8},
					{type: 'label', value: '<', x: -12, size: 2.5},
					{type: 'label', value: '>', x: 12, size: 2.5},
					{type: 'label', value: 'Modify Ship', y: -8, size: 1.8, link: 'shipmodify', callback: updateShipCostLabel},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'},
				]
			},
			shipmodify: {
				x: 0, y: 0, z: -40, sub: [
					{type: 'label', value: 'Ship Modify', y: 14, size: 3.6},
					{type: 'label', name: 'shipCostLabel', value: '', y: 9, size: 1.8},
					{type: 'point', parent: 'player', index: 0, place: "front", position: new Vector3(1.5, -1, 27)},
					{type: 'point', parent: 'player', index: 1, place: "front", position: new Vector3(-1.5, -1, 27)},
					{type: 'point', parent: 'player', index: 2, place: "top", position: new Vector3(0, 3, -5)},
					{type: 'point', parent: 'player', index: 3, place: "core", position: new Vector3(0, 0, 0)},
					{type: 'label', value: 'Back', y: -12, size: 1.8, link: 'shipselect'},
					{type: 'label', value: 'Main Menu', y: -16, size: 1.8, link: 'main'},
				]
			},
			difficulty: {
				x: 125, y: -100, sub: [
					{type: 'label', value: 'Difficulty', y: 16, size: 3.6},
					{type: 'label', value: 'Easy', y: 4, size: 1.8, callback: () => {
						selectedDifficulty = "easy";
						start();
					}},
					{type: 'label', value: 'Normal', size: 1.8, callback: start},
					{type: 'label', value: 'Hard', y: -4, size: 1.8, callback: () => {
						selectedDifficulty = "hard";
						start();
					}},
					{type: 'label', value: 'Back', y: -8, size: 1.8, link: 'main'},
					{
						type: 'model', value: assets.THREE_Model_GLTF.enem1.clone(), x: 8, y: -4, z: 0,
						init: model => model.rotateOnAxis(new Vector3(1, -1, -1).normalize(), 1)
					},
					{
						type: 'model', value: assets.THREE_Model_GLTF.enem1.clone(), x: -8, y: 4, z: 0,
						init: model => model.rotateOnAxis(new Vector3(1, -1, -1).normalize(), 1)
					},
					{
						type: 'model', value: assets.THREE_Model_GLTF.enem1.clone(), x: -10, y: -12, z: 40,
						init: model => model.rotateOnAxis(new Vector3(1, -1, -1).normalize(), 1)
					}
				]
			},
			setting: {
				x: 25, y: -144, sub: [
					{type: 'label', value: 'Settings', y: 14, size: 3.6},
					{type: 'label', value: 'KeyBinding', y: 5, size: 1.8},
					{type: 'label', value: 'Sound Volume', y: -5, size: 1.8},
					{type: 'label', value: 'Back', y: -16, size: 1.8, link: 'main'}
				]
			},
			credit: {
				x: 500, y: -500, sub: [
					{type: 'label', value: 'Credit', y: 14, size: 3.6},
					{type: 'label', value: 'Programing: axion014', y: 8, size: 1.8},
					{type: 'label', value: 'Back', y: -16, size: 1.8, link: 'main'}
				]
			}
		}

		const directionalLight = new DirectionalLight(0xffffff, 1);
		directionalLight.position.set(0, 0, 30);
		this.threeScene.add(directionalLight);
		this.threeScene.add(new AmbientLight(0x606060));
		threeComposer.renderer.setClearColor(0x66aaee, 1.0);
		this.threeScene.fog = new FogExp2(0x66aaee, 0.00025);
		this.camera.position.z = BASE_Z;

		const moveTo = (x, y, z) => {
			const dist = Math.hypot(this.camera.position.x - x, this.camera.position.y - y);
			this.addEasing(new Easing(this.camera.position).add(
				{x: x, y: y, z: BASE_Z + z},
				Math.max(dist * 3, 900),
				Easing.inOut(dist / 125 + 2.5)
			));
		};
		const moveToMain = () => {
			moveTo(50, -50, 0);
			this.removeEventListener('click', moveToMain);
		};
		const equipmentEdit = new Rectangle({
			width: vw * 0.75,
			height: vh * 0.75,
			fillColor: "#888",
			opacity: 0,
			selfOpacity: 0.65,
			strokeWidth: 2
		});

		Object.keys(menu).forEach(key => {
			const value = menu[key];
			value.z = value.z || 0;
			value.sub.forEach(selects => {
				if (selects.type === 'label') {
					selects = Object.assign({x: 0, y: 0}, selects);
					const pixratio = 32;
					const label = new Label(selects.value, {font: `${selects.size * pixratio}px 'HiraKakuProN-W3'`});
					label.scale.set(1 / pixratio, 1 / pixratio, 1);
					this.threeScene.add(label);
					label.position.set(value.x + selects.x, value.y + selects.y, value.z + 50);
					label.material.opacity = (1 - Math.min(Math.max(Math.abs(value.z) - 10, 0) * 0.1, 1)) * 0.5;
					if (selects.link) {
						label.addEventListener('click', () => {
							if (Math.abs(this.camera.position.z - label.position.z - 50) >= 1) return;

							moveTo(menu[selects.link].x, menu[selects.link].y, menu[selects.link].z || 0);
							if (selects.link === 'title') this.addEventListener('click', moveToMain);

							const movedToShipModify = selects.link === 'shipmodify';
							this.points.forEach(point => point.visible = movedToShipModify);

							this.position = selects.link;
						});
					}
					if (selects.callback) label.addEventListener('click', () => {
						if (Math.abs(this.camera.position.z - label.position.z - 50) < 1) selects.callback();
					});
					if(selects.name) this[selects.name] = label;
					this.labels.push(label);
				} else if (selects.type === 'model') {
					const add = (parent, models) => {
						models.forEach(model => {
							parent.add(model.value);
							model.value.position.set(value.x + model.x, value.y + model.y, value.z + model.z);
							if(model.init) model.init(model.value);
							if(model.name) this[model.name] = model.value;
							model.childrens && add(model.value, model.childrens);
						});
					}
					add(this.threeScene, [selects]);
				} else if (selects.type === 'point') {
					this.slots[selects.index] = selects;
					const scene = this;
					class EquipSlot extends Group {
						constructor(options) {
							super();
							this.hitTest = hitTestEllipse;
							this.radius = 16;
							this.data = options.data;
							this.mirror = options.mirror;
							this.visible = false;
							this.add(new Mark({strokeColor: "#4a4", strokeWidth: 1, width: 48, height: 48}));
							this.add(new Ellipse({fillColor: "#4a4", radius: 16, opacity: 0.5}));
							if (this.mirror) {
								this.link = THREE_Utils.createMeshLine([0, 0, 0, 0], {color: "#4a4", lineWidth: 2}, true);
								this.add(this.link);
							}
							this.addEventListener('click', () => {
								scene.interactive = false;
								back.interactive = true;
								scene.labels.forEach(label => label.interactive = false);
								scene.points.forEach(point => point.interactive = false);
								equipmentEdit.target = this.data;
								scene.UIScene.add(equipmentEdit);
								equipmentEdit.children.forEach(child => child.interactive = true);
								scene.addEasing(new Easing(equipmentEdit).add({opacity: 1}, 250, Easing.LINEAR));
								equipmentEdit.updateCurrent(currentSkills[this.data.index].klass, currentSkills[this.data.index].level);
							});
						}
					}
					const slot = new EquipSlot({data: selects});
					slot.position.z =　-1;
					this.UIScene.add(slot);
					this.points.push(slot);
					if (selects.mirror) {
						const mirrorslot = new EquipSlot({data: selects, mirror: slot});
						mirrorslot.position.z =　-1;
						this.UIScene.add(mirrorslot);
						this.points.push(mirrorslot);
					}
				}
			});
		});
		this.addEventListener('click', moveToMain);

		for (let i = 0; i < currentSkills.length; i++) {
			const skill = currentSkills[i];
			if (skill.name) skill.klass = byID[skill.name];
			shipCost += skill.klass.getCost(skill.level) * (this.slots[i].mirror ? 2 : 1);
		}

		equipmentEdit.skill = {};
		equipmentEdit.name = new Label("", {y: vh * 0.24});
		equipmentEdit.add(equipmentEdit.name);
		equipmentEdit.cost = new Label("", {y: vh * 0.18});
		equipmentEdit.add(equipmentEdit.cost);
		equipmentEdit.description = new LabelArea(" ", {
			width: vw * 0.42,
			font: "18px 'HiraKakuProN-W6'"
		});
		equipmentEdit.add(equipmentEdit.description);

		const left = new Label("<", {x: -vw * 0.28, font: "48px 'HiraKakuProN-W3'"});
		const right = new Label(">", {x: vw * 0.28, font: "48px 'HiraKakuProN-W3'"});
		const up = new Label("<", {
			x: -10, y: vh * 0.125, rotation: -Math.PI / 2, font: "48px 'HiraKakuProN-W3'"
		});
		const down = new Label(">", {
			x: -10, y: -vh * 0.125, rotation: -Math.PI / 2, font: "48px 'HiraKakuProN-W3'"
		});

		left.addEventListener('click', () => {
			let index = byPlace[equipmentEdit.target.place].indexOf(equipmentEdit.skill.klass);
			let klass;
			do {
				if (index === 0) {
					klass = byPlace[equipmentEdit.target.place][index = byPlace[equipmentEdit.target.place].length - 1];
				} else {
					klass = byPlace[equipmentEdit.target.place][--index];
				}
			} while (klass.unlockedLevel < 0);
			equipmentEdit.updateCurrent(klass, Math.min(equipmentEdit.skill.level, klass.unlockedLevel));
		});

		right.addEventListener('click', () => {
			let index = byPlace[equipmentEdit.target.place].indexOf(equipmentEdit.skill.klass);
			let klass;
			do {
				if (index === byPlace[equipmentEdit.target.place].length - 1) {
					klass = byPlace[equipmentEdit.target.place][index = 0];
				} else {
					klass = byPlace[equipmentEdit.target.place][++index];
				}
			} while (klass.unlockedLevel < 0);
			equipmentEdit.updateCurrent(klass, Math.min(equipmentEdit.skill.level, klass.unlockedLevel));
		});

		up.addEventListener('click', () => {
			if (equipmentEdit.skill.level < equipmentEdit.skill.klass.unlockedLevel)
				equipmentEdit.updateCurrent(equipmentEdit.skill.klass, equipmentEdit.skill.level + 1);
		});

		down.addEventListener('click', () => {
			if (equipmentEdit.skill.level > 0)
				equipmentEdit.updateCurrent(equipmentEdit.skill.klass, equipmentEdit.skill.level - 1);
		});

		equipmentEdit.add(left);
		equipmentEdit.add(right);
		equipmentEdit.add(up);
		equipmentEdit.add(down);

		equipmentEdit.ok = new Label();
		equipmentEdit.ok.y = -vh * 0.2;

		equipmentEdit.ok.addEventListener('click', () => {
			const oldskill = currentSkills[equipmentEdit.target.index];
			shipCost -= oldskill.klass.getCost(oldskill.level) * (equipmentEdit.target.mirror ? 2 : 1);
			shipCost += equipmentEdit.skill.klass.getCost(equipmentEdit.skill.level) * (equipmentEdit.target.mirror ? 2 : 1);
			currentSkills[equipmentEdit.target.index] = {klass: equipmentEdit.skill.klass, level: equipmentEdit.skill.level};
			currentSkills.forEach(skill => skill.name = skill.klass.id);
			localStorage.setItem(SKILLS, JSON.stringify(currentSkills));
			updateShipCostLabel();
			equipmentEdit.close();
		});

		equipmentEdit.add(equipmentEdit.ok);

		const back = new Label("Back", {y: -vh * 0.25});
		back.addEventListener('click', () => equipmentEdit.close());
		equipmentEdit.add(back);

		equipmentEdit.close = () => {
			back.interactive = false;
			this.interactive = true;
			this.labels.forEach(label => label.interactive = true);
			this.points.forEach(point => point.interactive = true);
			equipmentEdit.children.forEach(child => child.interactive = false);
			this.addEasing(
				new Easing(equipmentEdit)
					.add({opacity: 0}, 250, Easing.LINEAR)
					.trigger(() => equipmentEdit.parent.remove(equipmentEdit))
			);
		};
		equipmentEdit.updateCurrent = function(klass, level) {
			this.skill.klass = klass;
			this.skill.level = level;
			const changeing = this.skill.klass !== currentSkills[this.target.index].klass || this.skill.level !== currentSkills[this.target.index].level;
			this.ok.visible = changeing;
			this.ok.text = currentSkills[this.target.index].klass === byID.Empty ? 'Install' : 'Replace';
			this.ok.y = -vh * 0.2;
			if (klass === byID.Empty) {
				if (changeing) {
					this.name.text = ' ';
					this.ok.text = 'Uninstall';
					this.ok.y = -vh * 0.06;
				} else this.name.text = 'No module';
				this.cost.text = ' ';
			} else {
				this.name.text = `${klass.skillName} ${level + 1}`;
				this.cost.text = `Cost: ${klass.getCost(level) * (this.target.mirror ? 2 : 1)}`;
			}
			this.description.text = klass.getDescription(level);
		};
	}
	update(delta) {
		super.update(delta);
		this.time += delta * (this.position === 'shipmodify' ? 0.2 : 1);
		// Camera control
		this.player.quaternion.set(0, 0, 0, 1);
		this.player.rotateX(Math.sin(this.time * 0.00075) * 0.25);
		this.player.rotateY(-Math.PI / 2 + this.time * 0.0004);

		this.labels.forEach(label => {
			label.material.opacity = 1 - Math.min(Math.max(Math.abs(this.camera.position.z - label.position.z - 50) - 10, 0) * 0.1, 1);
		});

		const v = get(Vector3);
		this.points.forEach(point => {
			v.copy(point.data.position);
			if (point.mirror) v.x = -v.x;
			const pos = this[point.data.parent].localToWorld(v).project(this.camera);
			point.position.x = pos.x * vw / 2;
			point.position.y = pos.y * vh / 2;
			if (point.mirror) THREE_Utils.setMeshLineGeometry(point.link,
				[0, 0, point.mirror.position.x - point.position.x, point.mirror.position.y - point.position.y], true);
		});
		free(v);
	}
	static requiredResources = {
		THREE_Model_GLTF: ['enem1', 'airballoon'],
		THREE_Texture: {plane: 'data/images/3.png'}
	};
}
