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
	static place = ['core']; // any number of string id which shows where this module can be installed

	static maxLevel = 2; // level of this module never be more than the max level(permanent)
	static unlockedLevel = -1; // works similar to variable above but can change sometimes
}

export class ActiveSkill extends Skill {
	constructor(user, scene, level, position, object) {
		super(user, scene, level, position, object);
		this.cooldown = 0;
	}
	update() {
		if (this.cooldown > 0) this.cooldown--;
	}
	activate() {
		if (this.cooldown === 0) {
			//this.activate();
			//console.log('Active Skill ' + this.className + ' seems not implemented');
		}
	}

};

export class DeactivatableSkill extends Skill {
	constructor(user, scene, level, position, object) {
		super(user, scene, level, position, object);
		this.active = false;
	}
	activate() {
		this.active = !this.active;
	}
};

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
};

registerSkill(class extends Skill { // dont modify, this module is so special
	constructor(user, scene, level) {
		super(user, scene, level);
	}
	static id = 'Empty';
	static skillName = 'Uninstall';
	static place = ['top', 'core', 'front'];
	static unlockedLevel = 0;
	static getCost(level) {return 0;}
	static getDescription(level) {return '';}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		this.user.armor *= [1.175, 1.19, 1.205][level];
	}
	static id = 'ExtraArmor';
	static skillName = 'Extra armor';
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
		this.user.sharpness *= [1.25, 1.27, 1.28][level];
	}
	static id = 'Spear';
	static skillName = 'Spear';
	static place = ['front'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Increase damage on ramming into enemy by ' + [25, 27, 28][level] + '%.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
		this.user.speed *= [1.2, 1.213, 1.22][level];
		this.user.rotspeed *= [1.3, 1.32, 1.33][level];
	}
	static id = 'Acrobat';
	static skillName = 'Acrobat';
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Greatly increase your mobility.';
	}
});

registerSkill(class extends DeactivatableSkill {
	constructor(user, scene, level) {
		super(user, scene, level);
	}
	update() {
		const costrate = [100, 150, 200][this.level];
		const amount = Math.min([0.001, 0.00125, 0.0015][this.level], this.user.maxhp - this.user.hp, this.user.energy / costrate);
		this.user.energy -= amount * costrate;
		this.user.hp += amount;
	}
	static id = 'SelfRepair';
	static skillName = 'Self repair';
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'With this skill, your HP is no longer limited. Higher level one is faster but less energy efficient. Can toggle on/off by pushing activate key.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level) {
		super(user, scene, level);
	}
	update() {
		this.user.energy += Math.min([0.6, 0.63, 0.65][this.level], this.user.maxenergy - this.user.energy);
	}
	static id = 'ExtraGenerator';
	static skillName = 'Extra generator';
	static place = ['top', 'core'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Allows you to use skills more by increasing energy replenish speed.';
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
	static skillName = 'The glitch';
	static place = ['core'];
	//unlockedLevel: 0,
	getDescription(level) {
		return 'Do not use as this can completely break the game.';
	}
});

registerSkill(class extends DeactivatableSkill {
	constructor(user, scene, level) {
		super(user, scene, level);
		this.activated = false;
		var original = this.user.getDamage;
		this.user.getDamage = rawdmg => {
			if (this.active) {
				if (!this.activated) {
					this.activated = true;
					this.user.hp -= [0.02, 0.036, 0.056][level];
				}
				return original(rawdmg) * [1.2, 1.25, 1.3][level];
			}
			return original(rawdmg);
		};
	}
	update() {
		this.activated = false;
	}
	static id = 'OverHeating';
	static skillName = 'Overheating';
	static place = ['top', 'core'];
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Sacrifice your HP and increase firepower by ' + [20, 25, 30] + '%. Can toggle on/off by pushing activate key.';
	}
});

registerSkill(class extends DeactivatableSkill {
	update() {
		this.user.consumeEnergy(1.5, () => {
			const a = Math.random() * Math.PI * 2;
			const v = get(Vector3).set(Math.sin(a), Math.cos(a), 0);
			const q = get(Quaternion).copy(this.user.quaternion);
			rotate(q, v, Math.sqrt(Math.random() * 0.0009));
			v.copy(Axis.z).applyQuaternion(this.user.quaternion)
				.setLength(this.user.geometry.boundingBox.max.z).add(this.user.position);
			this.user.allies.bulletManager.create('bullet', v, q, {v: 1.02, atk: this.getDamage(atk)});
			free(v, q);
			this.scene.shakeScreen(2);
		});
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
	update() {
		super.update();
		if (this.duration > 0) {
			this.duration--;
			//const angle = Math.randfloat(0, Math.PI * 2);
			this.scene.shakeScreen(this.duration * 8);
			this.user.beam([36, 45, 50][this.level], 3, 25, 0, this.effect);
		}
	}
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([150, 250, 320][this.level], () => {
			this.duration = 3;
			this.effect = this.scene.effectManager.ray(this.user, [
				{color: 0xffffff, opacity: 0.2, radius: 1},
				{color: 0x00ffff, opacity: 0.2, radius: 2},
				{color: 0x0000ff, opacity: 0.2, radius: 4}
			], 7, (t, m) => 1 - t / m);
			return 15;
		}, 0);
		return true;
	}
	static id = 'Railgun';
	static skillName = 'Railgun';
	static place = ['front'];
	static unlockedLevel = 1;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'Shot deadly laser. Provides good firepower by consuming large amount of energy.';
	}
});

registerSkill(class extends ActiveSkill {
	update() {
		super.update();
		if (this.duration > 0) {
			this.duration--;
			//const angle = Math.random() * Math.PI * 2;
			this.scene.shakeScreen(this.duration);
			this.user.beam([10, 12, 15][this.level], 2, 15, [20, 25, 30][this.level], this.effect);
			if (this.duration === 0) {
				this.user.rotspeed *= [2, 4, 8][this.level];
			}
		} else if (this.delay > 0) {
			this.delay--;
			if (this.delay === 0) {
				this.duration = [20, 30, 40][this.level];
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
				this.scene.effectManager.ray(this.user, 0xffffff, 0.5, 500, 2);
				this.effect = this.scene.effectManager.ray(this.user, [
					{color: 0xffffff, opacity: 0.2, radius: [5, 6, 8][this.level]},
					{color: 0xffcccc, opacity: 0.2, radius: [8, 10, 12][this.level]},
					{color: 0xff8888, opacity: 0.2, radius: [12, 15, 18][this.level]},
					{color: 0xff4444, opacity: 0.2, radius: [16, 20, 24][this.level]},
					{color: 0xff0000, opacity: 0.2, radius: [20, 25, 30][this.level]}
				], [25, 35, 45][this.level], (t, m) => t < 4 ? 2 : (t < 6 ? 0.25 : 1 - (t - 6) / (m - 6)));
			}
		}
	}
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([1000, 1200, 1600][this.level], () => {
			this.delay = [5, 8, 12][this.level];
			this.user.rotspeed /= [2, 4, 8][this.level];
			this.scene.effectManager.ray(this.user, [
				{color: 0xffffff, opacity: 0.8, radius: [3, 3.75, 5][this.level]},
			], this.delay, (t, m) => t / m);
			return [250, 300, 400][this.level];
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
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([500, 630, 800][this.level], () => {
			this.user.summons.bulletManager.createBullet('laser', {
				position: this.user.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.user.quaternion).normalize(), this.user.geometry.boundingBox.max.z), quaternion: this.user.quaternion,
				v: 18, atk: [60, 70, 75][this.level], pierce: true, size: 2
			});
			return [180, 200, 240][this.level];
		}, 0);
		return true;
	}
	static id = 'Lasergun';
	static skillName = 'Laser gun';
	static place = ['front'];
	static unlockedLevel = 0;
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'The Laser can pierce enemies. Can deal massive damage against huge enemy by hitting their core.';
	}
});

registerSkill(class extends Skill {
	constructor(user, scene, level, position) {
		super(user, scene, level, position);
		this.instance = this.user.summons.create('blademinion', {
			position: this.user.position.clone(),
			active: false,
			stealth: true,
			base: this,
			hp: [50, 52, 52][level],
			sharpness: [3, 3.1, 3.1][level]
		});
		this.instance.material.color.set(0x111111);
		if (level >= 2) {
			this.instance2 = this.user.summons.create('blademinion', {
				position: this.user.position.clone(),
				active: false,
				stealth: true,
				base: this,
				hp: [50, 52, 52][level],
				sharpness: [3, 3.1, 3.1][level]
			});
			this.instance2.material.color.set(0x111111);
		}
	}
	activate() {
		if (this.instance.active || (this.level >= 2 && this.instance2.active)) {
			this.instance.target = this.user;
			this.instance2.target = this.user;
			return false;
		}
		if (!this.user.targetingEnemy) return false;
		this.user.consumeEnergy([280, 280, 600][this.level], () => {
			this.instance.active = true;
			this.instance.target = this.user.targetingEnemy;
			if (this.level >= 2) {
				this.instance2.active = true;
				this.instance2.target = this.user.targetingEnemy;
				this.instance.quaternion.copy(this.user.quaternion).rotateY(0.5);
				this.instance2.quaternion.copy(this.user.quaternion).rotateY(-0.5);
			} else this.instance.quaternion = this.user.quaternion.clone();
		});
		return true;
	}
	static id = 'BladeMinion';
	static skillName = 'Anti-material blade';
	static usingModels = ['blademinion'];
	static place = ['top'];
	static getCost(level) {return [100, 120, 150][level];}
	static getDescription(level) {
		return 'This blade will spawn out on activation and automatically chase your enemy. Can pull back with pushing activate key again.';
	}
});

registerSkill(class extends ActiveSkill {
	activate() {
		if (this.cooldown > 0) return false;
		this.cooldown = this.user.consumeEnergy([200, 750, 1500][this.level], () => {
			const repeat = [2, 4, 6][this.level];
			for (let i = 0; i < repeat; i++) {
				this.user.summons.create('assaultdrone', {
					position: this.user.position.clone().sub(Axis.z.clone().applyQuaternion(this.user.quaternion).setLength(500)).add(Axis.x.clone().applyQuaternion(this.user.quaternion).setLength(((repeat - 1) / 2 - i) * 150)),
					quaternion: this.user.quaternion.clone(),
					expire: [2000, 1800, 1500][this.level],
					hp: [8, 10, 11][this.level],
					chase: [0.06, 0.07, 0.08][this.level],
					v: [5.6, 6, 6.3][this.level],
					sharpness: [1.2, 1.4, 1.5][this.level],
					firerate: [28, 25, 24][this.level],
					bv: [7, 7.5, 8][this.level],
					atk: [7, 8, 8.5][this.level]
				});
			}
			return [2000, 2400, 3000][this.level];
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
