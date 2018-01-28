/*
 * About units
 *
 * The 3D Mesh of any unit have all their property
 *
 * extends THREE.Mesh
 *
 * ==== propertys ====
 *
 * hp					hitpoint
 * armor			most of damage this unit takes will divided by this value
 * sharpness	multiplier of body damage
 * time 			number of frames count up from 0
 * target			refer to a enemy unit used to trigger targetAttacked(optional)
 * summons		refer to the AllyManager or the EnemyManager
 * stealth		unit with this property true never shown in the rader
 * despawn		set this property to true will cause despawning of the unit without any death trigger. will checked after each update
 * --size--
 *
 * ===== methods =====
 *
 * update						the update routine will called each frame, and recieves this.summons to first argument
 * targetAttacked		this function will called when the unit ram to a enemy of this.target
 *									(optional but required if the unit has property 'target')
 */

phina.define('UnitManager', {
	init: function() {console.error(this.className + " is static")},
	_static: {
		loadedunit: {},
		get: function(n) {
			if (this.loadedunit[n]) return this.loadedunit[n];
			this.loadedunit[n] = {mesh: phina.asset.AssetManager.get('threejson', n), routine: this.units[n].routine.$safe({
				hp: 5, armor: 1, size: 1, v: 0, c: new THREE.Quaternion(), time: 0, sharpness: 1, update: function(){}
			}), autospawn: (this.units[n].autospawn || {}).$safe({rep: 1, options: {}})};
			if (!this.loadedunit[n].mesh) throw Error(n);
			this.loadedunit[n].mesh.data.geometry.computeBoundingBox();
			this.loadedunit[n].mesh.data.geometry.computeBoundingSphere();
			return this.loadedunit[n];
		},
		units: {
			enem1: {
				filename: 'enem-1',
				routine: {
					v: 0.6, chase: 0, firerate: 100, mindist: 0, aim: false,
					update: function(em) {
						var vecToTarget = em.player.position.clone().sub(this.position);
						var dir = new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(vecToTarget.clone().normalize()).normalize(), Math.acos(Axis.z.clone().dot(vecToTarget.clone().normalize())));
						if (!em.player.position.equals(this.position) && this.chase !== 0) {
							var spd = this.v * (this.mindist !== 0 ? Math.clamp((vecToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
							this.quaternion.slerp(dir, this.chase);
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), spd);
						} else {
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						}
						if (this.time % this.firerate === 0) {
							em.bulletManager.createBullet('bullet', {
								position: this.position, quaternion: this.aim ? dir : this.quaternion,
								v: 3.5, atk: 7
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
					hp: 75, v: 5, size: 15, chase: 0.04, sharpness: 2, firerate: 15, explodeTime: 30,
					update: function(em) {
						if (!em.player.position.equals(this.position)) {
							var dir = em.player.position.clone().sub(this.position);
							dir.normalize();
							this.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(dir).normalize(), Math.acos(Axis.z.clone().dot(dir))), this.chase);
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						}
						if (this.time % this.firerate === 0) {
							em.bulletManager.createBullet('bullet', {
								position: this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.geometry.boundingBox.max.z), quaternion: this.quaternion,
								v: 6, size: 1.5, atk: 10
							});
						}
					}
				}
			},
			enem3: {
				filename: 'enem-3',
				routine: {
					hp: 500, v: 0.25, size: 30, firerate: 1, r: 0.1, explodeTime: 30,
					scale: new THREE.Vector3(3, 3, 3),
					update: function(em) {
						this.quaternion.premultiply(this.c);
						this.rotateZ(this.r);
						this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						if (this.time % this.firerate === 0) {
							em.bulletManager.createBullet('bullet', {
								position: this.position, quaternion: this.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(
									Axis.x, 0.1 + (Math.PI - 0.1) * (this.time % (this.firerate * 8) / this.firerate / 8) / 20 * (Math.random() + 9))
								), v: 2.5, size: 0.5, atk: 5
							});
						}
					}
				}
			},
			blademinion: {
				filename: 'slicer',
				routine: {
					hp: 50, chase: 0.07, v: 7.5, sharpness: 3, size: 5, explodeTime: 30, stealth: true,
					scale: new THREE.Vector3(7, 7, 7),
					update: function(um) {
						if (this.active) {
							if (this.target.hp <= 0 || !this.target.parent) {
								if (this.target === this.base.user) {
									this.despawn = true;
									return;
								}
								this.target = this.base.user;
							}
							if (this.target === this.base.user && this.target.position.clone().sub(this.position).length() < this.v) {
								this.active = false;
								this.base.cooldown = 75;
							}
							if (!this.target.position.equals(this.position) && this.chase !== 0) {
								var vecToTarget = this.target.position.clone().sub(this.position).normalize();
								this.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(vecToTarget).normalize(), Math.acos(Axis.z.clone().dot(vecToTarget))), this.chase);
							}
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						} else {
							this.hp = Math.min(this.hp + 0.01, 50);
							if (this.base.user.hp <= 0) this.hp = 0;
							this.position.copy(this.base.user.position);
							this.quaternion.copy(this.base.user.quaternion);
						}
						this.stealth = !this.active;
					},
					targetAttacked: function() {
						this.target = this.base.user;
					}
				}
			},
			assaultdrone: {
				filename: 'assault',
				routine: {
					hp: 10, chase: 0.07, v: 6, bv: 7, atk: 8, sharpness: 1.4, firerate: 28, size: 5,
					mindist: 50, explodeTime: 20, expire: Infinity,
					update: function(um) {
						this.expire--;
						if (this.expire <= 0) {
							this.despawn = true;
							return;
						}
						if (!this.target || this.target.hp <= 0 || !this.target.parent) {
							if (um.opponents.elements.length !== 0) {
								this.target = um.opponents.elements.reduce(function(o, enm) {
									var d = enm.position.clone().sub(this.position).length();
									return d < o.d ? {d: d, enm: enm} : o;
								}.bind(this), {d: Infinity, enm: null}).enm;
							}
							if (!this.target) {
								this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
								return;
							}
						}
						var vecToTarget = this.target.position.clone().sub(this.position);
						var dir = new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(vecToTarget.clone().normalize()).normalize(), Math.acos(Axis.z.clone().dot(vecToTarget.clone().normalize())));
						if (!this.target.position.equals(this.position) && this.chase !== 0) {
							var spd = this.v * (this.mindist !== 0 ? Math.clamp((vecToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
							this.quaternion.slerp(dir, this.chase);
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), spd);
						} else {
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						}
						if (this.time % this.firerate === 0) {
							um.bulletManager.createBullet('bullet', {
								position: this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.geometry.boundingBox.max.z), quaternion: this.quaternion,
								v: this.bv, atk: this.atk
							});
						}
					},
					targetAttacked: function() {}
				}
			}
		}
	}
});
