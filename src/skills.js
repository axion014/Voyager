phina.define('Skill', {
	init: function(user, scene, level) {
		this.user = user;
		this.scene = scene;
		this.level = level;
	},
	update: function() {
	},
	_static: {
		place: ['core'], // any number of string id which shows where this module can be installed

		maxLevel: 2, // level of this module never be more than the max level(permanent)
		unlockedLevel: -1 // works similar to variable above but can change sometimes
	}
});

phina.define('ActiveSkill', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.cooldown = 0;
	},
	update: function() {
		if (this.cooldown > 0) this.cooldown--;
	},
	activate: function() {
		if (this.cooldown === 0) {
			//this.activate();
			//console.log('Active Skill ' + this.className + ' seems not implemented');
		}
	},

});

phina.define('DeactivatableSkill', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.active = false;
	},
	activate: function() {
		this.active = !this.active;
	}
});

var skills = {};
skills.byName = {};

var registerSkill = function(klass) {
	var lvlfrom = klass;
	while(lvlfrom.unlockedLevel === undefined) lvlfrom = lvlfrom.prototype.superClass;
	klass.unlockedLevel = lvlfrom.unlockedLevel;
	klass.place.each(function(place) {
		if (!skills[place]) skills[place] = [];
		skills[place].push(klass);
	});
	skills.byName[klass.prototype.className] = klass;
};

registerSkill(phina.define('Empty', { // dont modify, this module is so special
	superClass: 'Skill',
	init: function() {
		this.superInit();
	},
	_static: {
		skillName: 'Uninstall',
		place: ['top', 'core', 'front'],
		unlockedLevel: 0,
		getDescription: function(level) {return '';}
	}
}));

registerSkill(phina.define('ExtraArmor', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.user.armor *= [1.175, 1.19, 1.205][level];
	},
	_static: {
		skillName: 'Extra armor',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Reduce damage taken by ' + [15, 16, 17][level] + '%.';
		}
	}
}));

registerSkill(phina.define('Spear', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.user.sharpness *= [1.25, 1.27, 1.28][level];
	},
	_static: {
		skillName: 'Spear',
		place: ['front'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Increase damage deal on\nhitting enemy directly by ' + [25, 27, 28][level] + '%.';
		}
	}
}));

registerSkill(phina.define('Acrobat', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.user.speed *= [1.2, 1.213, 1.22][level];
		this.user.rotspeed *= [1.3, 1.32, 1.33][level];
	},
	_static: {
		skillName: 'Acrobat',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Greatly increase your mobility.';
		}
	}
}));

registerSkill(phina.define('SelfRepair', {
	superClass: 'DeactivatableSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		if (!this.active) return;
		var costrate = [50, 70, 100][this.level];
		var amount = Math.min([0.01, 0.0125, 0.015][this.level], this.user.maxhp - this.user.hp, this.user.energy / costrate);
		this.user.energy -= amount * costrate;
		this.user.hp += amount;
	},
	_static: {
		skillName: 'Self repair',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'With this skill, your HP is no\nlonger limited.\nHigher level one is faster but\nless energy efficient.\nCan toggle on/off by pushing activate key.\n';
		}
	}
}));

registerSkill(phina.define('ExtraGenerator', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		this.user.energy += Math.min([0.6, 0.63, 0.65][this.level], this.user.maxenergy - this.user.energy);
	},
	_static: {
		skillName: 'Extra generator',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Allows you to use skills more by increasing energy\nreplenish speed.';
		}
	}
}));

registerSkill(phina.define('Glitch', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		user.applyRotation = function() {
			// The order is important, even with quaternion. but...
			this.rotateX(this.myrot.x);
			this.rotateY(this.myrot.y);
			this.rotateZ(this.myrot.z1 + this.myrot.z2);
		};
	},
	_static: {
		skillName: 'The glitch',
		place: ['core'],
		//unlockedLevel: 0,
		getDescription: function(level) {
			return 'Do not use as this can completely break the game.';
		}
	}
}));

registerSkill(phina.define('OverHeating', {
	superClass: 'DeactivatableSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.activated = false;
		var original = this.user.getDamage;
		this.user.getDamage = function(rawdmg) {
			if (this.active) {
				if (!this.activated) {
					this.activated = true;
					this.user.hp -= [0.02, 0.036, 0.056][level];
				}
				return original(rawdmg) * [1.2, 1.25, 1.3][level];
			}
			return original(rawdmg);
		}.bind(this);
	},
	update: function() {
		this.activated = false;
	},
	_static: {
		skillName: 'Overheating',
		place: ['top', 'core'],
		getDescription: function(level) {
			return 'Sacrifice your HP and increase firepower by ' + [20, 25, 30] + '%.\nCan toggle on/off by pushing activate key.';
		}
	}
}));

registerSkill(phina.define('Railgun', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		if (this.cooldown > 0) this.cooldown--;
		if (this.duration > 0) {
			this.duration--;
			var angle = Math.randfloat(0, Math.PI * 2);
			this.scene.shakeScreen(this.duration * 8);
			this.user.beam([36, 45, 50][this.level], 3, 25, 0, this.scene);
		}
	},
	activate: function() {
		if (this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([150, 250, 320][this.level], function() {
			this.duration = 3;
			this.scene.effectManager.ray(this.user, [
				{color: 0xffffff, opacity: 0.2, radius: 1},
				{color: 0x00ffff, opacity: 0.2, radius: 2},
				{color: 0x0000ff, opacity: 0.2, radius: 4}
			], 7, function(t, m) {
				return 1 - t / m;
			});
			return 15;
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Railgun',
		place: ['front'],
		unlockedLevel: 1,
		getDescription: function(level) {
			return 'Shot deadly laser.\nProvides good firepower by\nconsuming large amount of\nenergy.';
		}
	}
}));

registerSkill(phina.define('ParticleCannon', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		if (this.cooldown > 0) this.cooldown--;
		if (this.duration > 0) {
			this.duration--;
			var angle = Math.randfloat(0, Math.PI * 2);
			this.scene.shakeScreen(this.duration);
			this.user.beam([10, 12, 15][this.level], 2, 15, [20, 25, 30][this.level], this.scene);
			if (this.duration === 0) {
				this.user.rotspeed *= [2, 4, 8][this.level];
			}
		}
		if (this.delay > 0) {
			this.delay--;
			if (this.delay === 0) {
				this.duration = [20, 30, 40][this.level];
				// flash effect
				var fade = new THREE.ShaderPass(phina.display.three.FadeShader);
				fade.uniforms.color.value = new THREE.Vector4(1, 1, 1, 0.8);
				this.scene.app.composer.addPass(fade);
				var frame = this.scene.frame;
				this.scene.on('enterframe', function tmp() {
					if (this.scene.frame - frame > 1) {
						this.scene.app.composer.passes.erase(fade);
						this.scene.off('enterframe', tmp);
					}
				}.bind(this));
				this.scene.effectManager.ray(this.user, 0xffffff, 0.5, 500, 2);
				this.scene.effectManager.ray(this.user, [
					{color: 0xffffff, opacity: 0.2, radius: [5, 6, 8][this.level]},
					{color: 0xffcccc, opacity: 0.2, radius: [8, 10, 12][this.level]},
					{color: 0xff8888, opacity: 0.2, radius: [12, 15, 18][this.level]},
					{color: 0xff4444, opacity: 0.2, radius: [16, 20, 24][this.level]},
					{color: 0xff0000, opacity: 0.2, radius: [20, 25, 30][this.level]}
				], [25, 35, 45][this.level], function(t, m) {return t < 4 ? 2 : (t < 6 ? 0.25 : 1 - (t - 6) / (m - 6));});
			}
		}
	},
	activate: function(trigger) {
		if (!trigger || this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([1000, 1200, 1600][this.level], function() {
			this.delay = [5, 8, 12][this.level];
			this.user.rotspeed /= [2, 4, 8][this.level];
			this.scene.effectManager.ray(this.user, [
				{color: 0xffffff, opacity: 0.8, radius: [3, 3.75, 5][this.level]},
			], this.delay, function(t, m) {return t / m;});
			return [250, 300, 400][this.level];
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Particle cannon',
		place: ['front'],
		getDescription: function(level) {
			return 'Powerful cannon that destroy ' + (level === 2 ? '' : 'almost ') + 'anything front of it.';
		}
	}
}));

registerSkill(phina.define('Lasergun', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	activate: function(trigger) {
		if (!trigger || this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([500, 630, 800][this.level], function() {
			console.log(this.user.summons.bulletManager.createBullet('laser', {
				position: this.user.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.user.quaternion).normalize(), this.user.geometry.boundingBox.max.z), quaternion: this.user.quaternion,
				v: 18, atk: [60, 70, 75], pierce: true
			}));
			return [180, 200, 240][this.level];
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Laser gun',
		place: ['front'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'The Laser can pierce enemies.\nDeals massive damage\nagainst huge enemy by\nhitting their core.';
		}
	}
}));

registerSkill(phina.define('BladeMinion', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.instance = this.user.summons.create('blademinion', {
			position: this.user.position.clone(),
			active: false,
			stealth: true,
			base: this,
			hp: [50, 52, 52][level],
			sharpness: [3, 3.1, 3.1][level]
		});
		this.instance.material.color = new THREE.Color(0x111111);
		if (level >= 2) {
			this.instance2 = this.user.summons.create('blademinion', {
				position: this.user.position.clone(),
				active: false,
				stealth: true,
				base: this,
				hp: [50, 52, 52][level],
				sharpness: [3, 3.1, 3.1][level]
			});
			this.instance2.material.color = new THREE.Color(0x111111);
		}
	},
	activate: function(trigger) {
		if (!trigger) return;
		if (this.instance.active || (this.level >= 2 && this.instance2.active)) {
			this.instance.target = this.user;
			this.instance2.target = this.user;
			return;
		}
		if (!this.user.targetingEnemy) return;
		this.user.consumeEnergy([280, 280, 600][this.level], function() {
			this.instance.active = true;
			this.instance.target = this.user.targetingEnemy;
			if (this.level >= 2) {
				this.instance2.active = true;
				this.instance2.target = this.user.targetingEnemy;
				this.instance.quaternion.copy(this.user.quaternion).rotateY(0.5);
				this.instance2.quaternion.copy(this.user.quaternion).rotateY(-0.5);
			} else {
				this.instance.quaternion = this.user.quaternion.clone();
			}
		}.bind(this));
	},
	_static: {
		skillName: 'Anti-material blade',
		usingModels: ['blademinion'],
		place: ['top'],
		getDescription: function(level) {
			return 'This blade will spawn out on\nactivation and automatically\nchase your enemy.\nCan pull back with pushing\nactivate key again.';
		}
	}
}));

registerSkill(phina.define('Reinforce', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	activate: function() {
		if (this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([200, 750, 1500][this.level], function() {
			var repeat = [2, 4, 6][this.level];
			repeat.times(function(i) {
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
			}, this);
			return [2000, 2400, 3000][this.level];
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Reinforce',
		usingModels: ['assaultdrone'],
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Larger fleet ascend you to the\nvictory.';
		}
	}
}));
