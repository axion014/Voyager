import {Group, Quaternion, Vector3, Vector4} from "three";

import ShaderPass from "w3g/three-effect/ShaderPass";
import FadeShader from "w3g/three-effect/FadeShader";

import {Axis, rotate} from "w3g/threeutil";
import {get, free} from "w3g/utils";

class Skill {
	constructor(user, scene, level, position, object) {
		this.user = user;
		this.scene = scene;
		this.level = level;
		if (position) {
			this.threeObject = object || new Group();
			this.threeObject.position.copy(position);
			this.user.add(this.threeObject);
		}
	}
	update() {}
	getType() {return 'passive';}
	static place = ['core']; // any number of string id which shows where this module can be installed

	static maxLevel = 2; // level of this module never be more than the max level(permanent)
	static unlockedLevel = -1; // works similar to variable above but can change sometimes
}

class ActiveSkill extends Skill {
	constructor(user, scene, level, position, object) {
		super(user, scene, level, position, object);
		this.cooldown = 0;
	}
	update(delta) {
		this.cooldown = Math.max(this.cooldown - delta, 0);
	}
	activate() {
		if (this.cooldown === 0) {
			//this.activate();
			//console.log('Active Skill ' + this.className + ' don't seem to be implemented');
		}
	}
	getType() {return 'active';}
}

class DeactivatableSkill extends Skill {
	constructor(user, scene, level, position, object) {
		super(user, scene, level, position, object);
		this.active = false;
	}
	activate() {
		this.active = !this.active;
	}
	getType() {return 'toggle';}
}

export const byPlace = {};
export const byID = {};

function registerSkill(klass) {
	let lvlfrom = klass;
	while(lvlfrom.unlockedLevel === undefined) lvlfrom = lvlfrom.prototype.superClass;
	klass.unlockedLevel = lvlfrom.unlockedLevel;
	klass.place.forEach(place => {
		if (!byPlace[place]) byPlace[place] = [];
		byPlace[place].push(klass);
	});
	byID[klass.id] = klass;
}

registerSkill(class extends Skill { // dont modify, this module is so special
	constructor(user, scene, level) {
		super(user, scene, level);
	}
	static id = 'Empty';
	static skillName = 'Uninstall';
	static place = ['top', 'core', 'front', 'wing'];
	static unlockedLevel = 0;
	static getCost(level) {return 0;}
	static getDescription(level) {return '';}
});

registerSkill(class extends ActiveSkill {
	constructor(user, scene, level, position, klass) {
		super(user, scene, 0);
		this.instance1 = new klass(user, scene, level, position);
		const mirrored = get(Vector3).copy(position);
		mirrored.x = -mirrored.x;
		this.instance2 = new klass(user, scene, level, mirrored);
		free(mirrored);
	}
	activate() {
		const result = this.instance1.activate();
		return this.instance2.activate() || result;
	}
	update(delta) {
		this.instance1.update(delta);
		this.instance2.update(delta);
	}
	getType() {
		return this.instance1.getType();
	}
	static id = 'Fork';
	static place = [];
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		this.user.armor *= [1.175, 1.19, 1.205][level];
	}
	static id = 'ExtraArmor';
	static skillName = 'Hardened alloy hull';
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Reduce damage taken by ' + [15, 16, 17][level] + '%.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		this.user.sharpness *= [1.5, 1.53, 1.54][level];
	}
	static id = 'Spear';
	static skillName = 'Sharpened frontal hull';
	static place = ['front'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Increase damage on ramming into enemy by ' + [50, 53, 54][level] + '%.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		this.user.speed *= [1.2, 1.213, 1.22][level];
		this.user.rotspeed *= [1.3, 1.32, 1.33][level];
	}
	static id = 'Acrobat';
	static skillName = 'Aerodynamically optimal wings';
	static place = ['top', 'wing'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Greatly increase your mobility in air.'; //TODO: Disable this on space
	}
});

registerSkill(class extends DeactivatableSkill {
	constructor(user, scene, level) {
		super(user, scene, level);
	}
	update(delta) {
		const costrate = [100, 150, 200][this.level];
		const amount = Math.min([0.00003, 0.00004, 0.00005][this.level] * delta, this.user.maxhp - this.user.hp, this.user.energy / costrate);
		this.user.energy -= amount * costrate;
		this.user.hp += amount;
	}
	static id = 'SelfRepair';
	static skillName = 'Self repair package';
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Regenerate your HP over time. Higher level one is faster but less energy efficient. Can be toggled on/off by pushing activate key.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
	}
	update(delta) {
		this.user.energy += Math.min([0.01, 0.0105, 0.011][this.level] * delta, this.user.maxenergy - this.user.energy);
	}
	static id = 'ExtraGenerator';
	static skillName = 'Extra generator';
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Increase energy replenish speed, allowing you to use skills more often.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		user.maxenergy += [400, 430, 450][level];
	}
	static id = 'ExtraBattery';
	static skillName = 'Extra battery';
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Increase maximum energy storage.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		user.precision *= [1.8, 1.9, 2][level];
	}
	static id = 'PrecisionBonus';
	static skillName = 'Vector adjuster array';
	static place = ['front'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Improve precision of the main cannons.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		user.applyRotation = function() {
			// The order is important, even with quaternion. but...
			this.rotateX(this.myrot.x);
			this.rotateY(this.myrot.y);
			this.rotateZ(this.myrot.z1 + this.myrot.z2);
		};
	}
	static id = 'Glitch';
	static skillName = 'DEF-���� glitch';
	static place = ['core'];
	//unlockedLevel: 0,
	static getCost(level) {return [100, 120, 150][level];}
	getDescription(level) {
		return 'Do not use this, it can completely break the game.';
	}
});

registerSkill(class extends DeactivatableSkill {
	constructor(user, scene, level) {
		super(user, scene, level);
		this.activated = false;
		const original = this.user.primary.getDamage;
		this.user.primary.getDamage = () => {
			if (this.active) {
				if (!this.activated) {
					this.activated = true;
					this.user.hp -= [0.02, 0.036, 0.056][level];
				}
				return original() * [1.2, 1.25, 1.3][level];
			}
			return original();
		};
	}
	update() {
		this.activated = false;
	}
	static id = 'OverHeating';
	static skillName = 'Barrel overheating';
	static place = ['top', 'core'];
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Sacrifice your HP and increase firepower by ' + [20, 25, 30] + '%. Can toggle on/off by pushing activate key.';
	}
});

registerSkill(class extends DeactivatableSkill {
	constructor(user, scene, level, position) {
		super(user, scene, level, position);
		this.cooldown = 0;
	}
	update(delta) {
		const v = get(Vector3);
		const q = get(Quaternion);
		const d = get(Vector3);
		this.threeObject.updateWorldMatrix();
		for (this.cooldown -= delta; this.cooldown <= 0; this.cooldown += 30) this.user.consumeEnergy(1.5, () => {
			const a = Math.random() * Math.PI * 2;
			rotate(q.copy(this.user.quaternion), v.set(Math.sin(a), Math.cos(a), 0), Math.sqrt(Math.random() * 0.0009));
			v.setFromMatrixPosition(this.threeObject.matrixWorld)
				.add(d.copy(Axis.z).applyQuaternion(q).multiplyScalar(-this.cooldown));
			this.user.allies.bulletManager.create('bullet', v, q, {v: 1.02, atk: this.getDamage()});
			this.scene.shakeScreen(2);
		});
		free(v, q, d);
	}
	static id = 'Machinegun';
	static skillName = 'Machinegun';
	static place = ['front', 'wing'];
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Shoot bullets with high rate of fire.';
	}
});

registerSkill(class extends ActiveSkill {
	getDamage() {
		return [1, 1.3, 1.5][this.level];
	}
	update(delta) {
		super.update(delta);
		if (this.duration > 0) {
			this.duration -= delta;
			//const angle = Math.randfloat(0, Math.PI * 2);
			this.scene.shakeScreen(this.duration * 0.1);
			const v = get(Vector3).addVectors(this.user.position, this.threeObject.position);
			this.user.allies.beam(v, this.user.quaternion, this.getDamage() * delta, 3, 25, 0, this.effect);
			free(v);
		}
	}
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([150, 250, 320][this.level], () => {
			this.duration = 100;
			this.effect = this.scene.effectManager.ray(this.threeObject, [
				{color: 0xffffff, opacity: 0.2, radius: 1},
				{color: 0x00ffff, opacity: 0.2, radius: 2},
				{color: 0x0000ff, opacity: 0.2, radius: 4}
			], 100, (t, m) => 1 - t / m);
			return 500;
		}, 0);
		return true;
	}
	static id = 'Railgun';
	static skillName = 'Railgun';
	static place = ['front', 'wing'];
	static unlockedLevel = 1;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Shot deadly laser. Provides good firepower by consuming large amount of energy.';
	}
});

registerSkill(class extends ActiveSkill {
	getDamage() {
		return [0.3, 0.4, 0.5][this.level];
	}
	update(delta) {
		super.update(delta);
		if (this.duration > 0) {
			this.duration -= delta;
			//const angle = Math.random() * Math.PI * 2;
			this.scene.shakeScreen(this.duration);
			const v = get(Vector3).addVectors(this.user.position, this.threeObject.position);
			this.user.allies.beam(v, this.user.quaternion, this.getDamage() * delta, 2, 15, [20, 25, 30][this.level], this.effect);
			free(v);
			if (this.duration <= 0) {
				this.user.rotspeed *= [2, 4, 8][this.level];
			}
		} else if (this.delay > 0) {
			this.delay -= delta;
			if (this.delay <= 0) {
				this.duration = [600, 900, 1200][this.level];
				// flash effect
				const fade = new ShaderPass(new FadeShader());
				fade.uniforms.color.value.set(1, 1, 1, 0.8);
				this.scene.app.composer.addPass(fade);
				const frame = this.scene.frame;
				this.scene.on('enterframe', function tmp() {
					if (this.scene.frame - frame > 1) {
						this.scene.app.composer.passes.erase(fade);
						this.scene.off('enterframe', tmp);
					}
				});
				this.scene.effectManager.ray(this.threeObject, 0xffffff, 0.5, 500, 2);
				this.effect = this.scene.effectManager.ray(this.threeObject, [
					{color: 0xffffff, opacity: 0.2, radius: [5, 6, 8][this.level]},
					{color: 0xffcccc, opacity: 0.2, radius: [8, 10, 12][this.level]},
					{color: 0xff8888, opacity: 0.2, radius: [12, 15, 18][this.level]},
					{color: 0xff4444, opacity: 0.2, radius: [16, 20, 24][this.level]},
					{color: 0xff0000, opacity: 0.2, radius: [20, 25, 30][this.level]}
				], [750, 1000, 1400][this.level], (t, m) => t < 120 ? 2 : (t < 180 ? 0.25 : 1 - (t - 180) / (m - 180)));
			}
		}
	}
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([1000, 1200, 1600][this.level], () => {
			this.delay = [150, 240, 360][this.level];
			this.user.rotspeed /= [2, 4, 8][this.level];
			this.scene.effectManager.ray(this.threeObject, [
				{color: 0xffffff, opacity: 0.8, radius: [3, 3.75, 5][this.level]},
			], this.delay, (t, m) => t / m);
			return [7500, 9000, 12000][this.level];
		}, 0);
		return true;
	}
	static id = 'ParticleCannon';
	static skillName = 'Particle cannon';
	static place = ['front'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Powerful cannon that destroys ' + (level === 2 ? '' : 'almost ') + 'anything front of it.';
	}
});

registerSkill(class extends ActiveSkill {
	getDamage() {
		return [60, 70, 75][this.level];
	}
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([500, 630, 800][this.level], () => {
			const v = get(Vector3).addVectors(this.user.position, this.threeObject.position);
			this.user.allies.bulletManager.createBullet('laser', v, this.user.quaternion, {
				v: 1, atk: this.getDamage(), pierce: true, size: 2
			});
			free(v);
			return [5400, 6000, 720][this.level];
		}, 0);
		return true;
	}
	static id = 'Lasergun';
	static skillName = 'Laser gun';
	static place = ['front', 'wing'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'The Laser gun can pierce enemies. Can deal massive damage against huge enemies by hitting their core.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level, position) {
		super(user, scene, level, position);
		this.instance = this.user.allies.create('blademinion', this.user.position, this.user.quaternion);
		this.instance.base = this;
		this.instance.hp = [50, 52, 54][level];
		this.instance.sharpness = [3, 3.1, 3.2][level];
		this.instance.material.color.set(0x111111);
		/*if (level >= 2) {
			this.instance2 = this.user.allies.create('blademinion', {
				position: this.user.position.clone(),
				active: false,
				stealth: true,
				base: this,
				hp: [50, 52, 52][level],
				sharpness: [3, 3.1, 3.1][level]
			});
			this.instance2.material.color.set(0x111111);
		}*/
	}
	activate() {
		if (this.instance.active/* || (this.level >= 2 && this.instance2.active)*/) {
			this.instance.target = this.user;
			//this.instance2.target = this.user;
			return false;
		}
		if (!this.user.targetingEnemy) return false;
		this.user.consumeEnergy([280, 300, 320][this.level], () => {
			this.instance.active = true;
			this.instance.target = this.user.targetingEnemy;
			this.instance.position.add(this.threeObject.position);
			/*if (this.level >= 2) {
				this.instance2.active = true;
				this.instance2.target = this.user.targetingEnemy;
				this.instance.quaternion.rotateY(0.5);
				this.instance2.quaternion.copy(this.user.quaternion).rotateY(-0.5);
			}*/
		});
		return true;
	}
	static id = 'BladeMinion';
	static skillName = 'Anti-material blade slots';
	static usingModels = ['blademinion'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static place = ['top', 'wing'];
	static getDescription(level) {
		return 'This blade will spawn out on activation and automatically chase your enemy. Can pull back with pushing activate key again.';
	}
});

registerSkill(class extends ActiveSkill {
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([200, 750, 1500][this.level], () => {
			const repeat = [2, 4, 6][this.level];
			const v = get(Vector3);
			for (let i = 0; i < repeat; i++) {
				v.subVectors(this.user.position, Axis.z.clone().applyQuaternion(this.user.quaternion).setLength(500))
					.add(Axis.x.clone().applyQuaternion(this.user.quaternion).setLength(((repeat - 1) / 2 - i) * 150));
				this.user.allies.create('assaultdrone', v, this.user.quaternion, {
					expire: [60000, 54000, 45000][this.level],
					hp: [8, 10, 11][this.level],
					chase: [0.06, 0.07, 0.08][this.level],
					v: [5.6, 6, 6.3][this.level],
					sharpness: [1.2, 1.4, 1.5][this.level],
					firerate: [28, 25, 24][this.level],
					bv: [7, 7.5, 8][this.level],
					atk: [7, 8, 8.5][this.level]
				});
			}
			free(v);
			return [60000, 72000, 90000][this.level];
		}, 0);
		return true;
	}
	static id = 'Reinforce';
	static skillName = 'Reinforce';
	static usingModels = ['assaultdrone'];
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Larger fleet ascend you to the victory.';
	}
});
