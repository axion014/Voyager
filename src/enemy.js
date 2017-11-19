phina.define('fly.EnemyManager', {
	superClass: 'fly.SimpleUpdater',

	loadedenemy: [], enemyraders: [], groups: [],
	killcount: 0, allcount: 0,

	init: function(s, ts, bh, ms) {
		this.superInit();
		this.scene = s;
		this.threescene = ts;
		this.gauge_boss_h = bh;
		this.message = ms;
		this.effectmanager = fly.EffectManager(ts).addChildTo(this);
	},

	loadEnemy: function(n) {
		this.loadedenemy[n] = {mesh: phina.asset.AssetManager.get('threejson', n), routine: this.enemys[n].routine.$safe({
			hp: 5, size: 1, v: 0, c: new THREE.Quaternion(), time: 0, update: function(){}
		}), autospawn: (this.enemys[n].autospawn || {}).$safe({rep: 1, options: {}})};
		this.loadedenemy[n].mesh.data.geometry.computeBoundingBox();
		this.loadedenemy[n].mesh.data.geometry.computeBoundingSphere();
	},
	createEnemy: function(n, r, g, t, p) {
		if(p) {
			var func = function(e) {
				if (e.progress > p) {
					this.createEnemy(n, r, g, t);
					this.off('frame', func)
				}
			}
			this.on('frame', func, this);
		} else if (t) {
			this.on('frame' + (this.scene.frame + t), function() {this.createEnemy(n, r, g);}.bind(this));
		} else {
			var enemy = this.loadedenemy[n].mesh.get(false, true);
			THREE.$extend(enemy, this.loadedenemy[n].routine);
			THREE.$extend(enemy, r);
			enemy.group = g;
			this.threescene.add(enemy);
			this.elements.push(enemy);
			var rader = phina.display.CircleShape({radius: 3, fill: 'hsla(0, 80%, 60%, 0.5)', stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1}).addChildTo(this.scene);
			var xdist = (this.player.position.x - enemy.position.x) / 25;
			var zdist = (this.player.position.z - enemy.position.z) / 25;
			var distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)), 75);
			var angle = Math.atan2(xdist, zdist) - this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
			rader.setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
			this.enemyraders.push(rader);
			if (r.boss) {
				this.scene.bosscoming = true;
				this.scene.boss = enemy;
				this.gauge_boss_h.tweener.fadeIn(10).play();
				this.gauge_boss_h.value = enemy.hp;
				this.gauge_boss_h.maxValue = enemy.hp;
			}
			return enemy;
		}
	},
	createEnemyMulti: function(n, r, as, km) {
		var autospawn = as.$safe(this.loadedenemy[n].autospawn);
		this.groups.push({num: autospawn.rep, message: km});
		if (r.boss) {this.scene.bossdefeated = false;}
		for(var i = 0; i < autospawn.rep; i++) {
			var nr = {position: new THREE.Vector3()};
			THREE.$extend(nr, r);
			this.createEnemy(n, nr, this.groups.last, autospawn.time, autospawn.progress);
			if (autospawn.delay) {autospawn.time += autospawn.delay;}
			THREE.$add(r, autospawn.options);
			r.position.add(new THREE.Vector3(
				Math.random() * autospawn.random.x * 2 - autospawn.random.x,
				Math.random() * autospawn.random.y * 2 - autospawn.random.y,
				Math.random() * autospawn.random.z * 2 - autospawn.random.z));
		}
		this.allcount += autospawn.rep;
	},

	update: function() {
		for (var i = 0; i < this.count(); i++) {
			this.get(i).update(this);
			this.get(i).time++;
			var xdist = (this.player.position.x - this.get(i).position.x) / 25;
			var zdist = (this.player.position.z - this.get(i).position.z) / 25;
			var distance = Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2));
			if (distance > 100) {
				this.enemyraders[i].hide();
				continue;
			}
			this.enemyraders[i].show();
			var distance = Math.min(distance, 75);
			var angle = Math.atan2(xdist, zdist);
			this.enemyraders[i].setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
			if (this.get(i).hp <= 0) {
				this.kill(i);
				i--;
			}
		}
	},

	removeEnemy: function(i) {
		var enemy = this.get(i);
		if (enemy.group) {
			enemy.group.num--;
			if (enemy.group.num === 0 && enemy.group.message) {
				var text = enemy.group.message.text;
				if (enemy.group.message.offkill) {this.message.text = '';}
				if (text !== '') {
					this.on('frame' + (this.scene.frame + (enemy.group.message.time - 5)), function() 	{this.message.text = '';}.bind(this));
					this.on('frame' + (this.scene.frame + enemy.group.message.time), function() 	{this.message.text = text;}.bind(this));
				}
			}
		}
		if (this.player.targetingEnemy === enemy) {
			this.player.way = null;
			this.player.targetingEnemy = null;
		}
		enemy.parent.remove(enemy);
		THREE.applyToAllMaterial(enemy.material, function(m) {m.dispose();});
		this.remove(i);
		this.enemyraders[i].remove();
		this.enemyraders.splice(i, 1);
	},

	kill: function(i) {
		this.effectmanager.explode(this.get(i).position, this.get(i).size, this.get(i).explodeTime);
		this.scene.score += this.get(i).size;
		this.killcount++;
		this.removeEnemy(i);
	},

	// Enemys routine
	enemys: {
		enem1: {
			filename: 'enem-1',
			routine: {
				v: 0.6, chase: 0, duration: 100, mindist: 0, aim: false,
				update: function(em) {
					var vecToTarget = em.player.position.clone().sub(this.position.clone());
					var dir = new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(vecToTarget.clone().normalize()).normalize(), Math.acos(Axis.z.clone().dot(vecToTarget.clone().normalize())));
					if (!em.player.position.equals(this.position) && this.chase !== 0) {
						var spd = this.v * (this.mindist !== 0 ? Math.clamp((vecToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
						this.quaternion.slerp(dir, this.chase);
						this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), spd);
					} else {
						this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
					}
					if (this.time % this.duration === 0) {
						em.enmBulletManager.createBullet({
							position: this.position, quaternion: this.aim ? dir : this.quaternion,
							v: 3.5, atk: 70
						});
					}
					this.quaternion.premultiply(this.c);
				}
			},
			autospawn: {rep: 6, delay: 15}
		},
		enem2: {
			filename: 'enem-2',
			routine: {
				hp: 45, v: 5, size: 15, chase: 0.04, duration: 15, explodeTime: 30,
				update: function(em) {
					if (!em.player.position.equals(this.position)) {
						var dir = em.player.position.clone().sub(this.position.clone());
						dir.normalize();
						this.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(dir).normalize(), Math.acos(Axis.z.clone().dot(dir))), this.chase);
						this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
					}
					if (this.time % this.duration === 0) {
						em.enmBulletManager.createBullet({
							position: this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.geometry.boundingBox.max.z), quaternion: this.quaternion,
							v: 6, size: 1.5, atk: 100
						});
					}
				}
			}
		},
		enem3: {
			filename: 'enem-3',
			routine: {
				hp: 500, v: 0.25, size: 30, duration: 1, r: 0.1, explodeTime: 30,
				scale: new THREE.Vector3(2, 2, 2),
				update: function(em) {
					this.quaternion.premultiply(this.c);
					this.rotateZ(this.r);
					this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
					if (this.time % this.duration === 0) {
						em.enmBulletManager.createBullet({
							position: this.position, quaternion: this.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(
								Axis.x, 0.1 + (Math.PI - 0.1) * (this.time % (this.duration * 8) / this.duration / 8) / 20 * (Math.random() + 9))
							), v: 2.5, size: 0.5, atk: 50
						});
					}
				}
			}
		}
	}
});
