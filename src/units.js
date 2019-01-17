import {Vector3, Quaternion, Raycaster} from "three";

import * as THREE_Utils from "w3g/threeutil";
import {normalizeAngle, opt} from "w3g/utils";
import assets from "w3g/loading";
import {createEllipse} from "w3g/geometries";
import {mouseX, mouseY, keys, keyDown} from "w3g/input";

import {minimapScale} from "./mainscene";
import ElementManager from "./elementmanager";
import {testOBBSphere, testCupsuleSphere} from "./collision";

/*
 * About units
 *
 * The 3D Mesh of any unit have all their property
 *
 * extends THREE.Mesh
 *
 * ==== properties ====
 *
 * hp					hitpoint
 * armor			most of damage this unit takes will divided by this value
 * sharpness	multiplier of body damage
 * weight			unit with high weight can push enemy
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

export class UnitManager extends ElementManager {

	groups = [];
	raders = [];
	spawncount = 0;
	deathcount = 0;

	constructor(s, bm) {
		super();
		this.scene = s;
		this.bulletManager = bm;
	}

	create(name, properties, group, delay, targetProgress) {
		if (targetProgress) {
			const checkForProgress = e => {
				if (this.scene.progress > targetProgress) {
					this.create(name, properties, targetTime);
					this.removeEventListener('update', checkForProgress);
				}
			};
			this.addEventListener('update', checkForProgress);
		} else if (delay) window.setTimeout(() => this.create(name, properties), delay);
		else {
			this.spawncount++;
			const unit = deepclone(get(name).mesh, false, true);
			THREE.$extend(unit, get(name).properties);
			THREE.$extend(unit, properties);
			if (!unit.hp) unit.hp = unit.maxhp;
			if (!unit.energy) unit.energy = unit.maxenergy;
			unit.allies = this;
			unit.opponents = this.opponents;
			unit.group = group;
			unit.scene = this.scene;
			group.size++;
			unit.init();
			this.scene.threeScene.add(unit);
			this.elements.push(unit);
			const rader = createEllipse({radius: 3, fill: 'hsl(210, 80%, 60%)', stroke: 'black', strokeWidth: 1, opacity: 0.5});
			const xdist = this.scene.player.position.x - unit.position.x;
			const zdist = this.scene.player.position.z - unit.position.z;
			const distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) * minimapScale, 75);
			const angle = Math.atan2(xdist, zdist) - this.scene.player.myrot.y +
				(Math.abs(this.scene.player.myrot.x) > Math.PI / 2 && Math.abs(this.scene.player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
			rader.setPosition(vw - 100 + Math.sin(angle) * distance, vh - 100 + Math.cos(angle) * distance);
			this.scene.UIScene.add(rader);
			this.raders.push(rader);
			if (unit.stealth) rader.hide();
			if (properties.boss) {
				this.scene.bosscoming = true;
				this.scene.boss = unit;
				this.scene.gauge_boss_h.tweener.fadeIn(10).play();
				this.scene.gauge_boss_h.value = unit.hp;
				this.scene.gauge_boss_h.maxValue = unit.hp;
			}
			return unit;
		}
	}

	createMulti(name, properties, autospawn, km) {
		autospawn = Object.assign(get(name).autospawn, autospawn);
		const group = {size: 0, message: km};
		this.groups.push(group);
		for(let i = 0; i < autospawn.rep; i++) {
			const nr = {position: new Vector3()};
			THREE.$extend(nr, properties);
			this.create(name, properties, group, autospawn.time, autospawn.progress);
			if (autospawn.delay) {autospawn.time += autospawn.delay;}
			THREE.$add(properties, autospawn.options);
			properties.position.add(new Vector3(
				Math.random() * autospawn.random.x * 2 - autospawn.random.x,
				Math.random() * autospawn.random.y * 2 - autospawn.random.y,
				Math.random() * autospawn.random.z * 2 - autospawn.random.z));
		}
	}

	update(delta) {
		this.dispatchEvent({type: "update"});
		this.forEach((unit, i) => {
			this.opponents.bulletManager.hitTest(unit);
			unit.update(delta);
			if (unit.despawn) {
				this.remove(i);
				return;
			}
			if (unit.hp <= 0) {
				this.kill(i);
				return;
			}
			unit.time += delta;
			const xdist = this.player.position.x - unit.position.x;
			const zdist = this.player.position.z - unit.position.z;
			const distance = Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) * minimapScale;
			if (unit.stealth || distance > 100) {
				this.raders[i].hide();
				return;
			}
			this.raders[i].show();
			distance = Math.min(distance, 75);
			const angle = Math.atan2(xdist, zdist);
			this.raders[i].setPosition(vw - 100 + Math.sin(angle) * distance, vh - 100 + Math.cos(angle) * distance);
		});
	}

	remove(i) {
		const unit = this.get(i);
		if (unit.group) {
			unit.group.size--;
			if (unit.group.size === 0 && unit.group.message) {
				const text = unit.group.message.text;
				if (unit.group.message.offkill) this.scene.message.text = '';
				if (text !== '') {
					this.on('frame' + (this.scene.frame + (unit.group.message.time - 5)), () =>	this.scene.message.text = '');
					this.on('frame' + (this.scene.frame + unit.group.message.time), () =>	this.scene.message.text = text);
				}
			}
		}
		unit.parent.remove(unit);
		applyToAllMaterials(unit.material, m => m.dispose());
		super.remove(i);
		this.raders[i].remove();
		this.raders.splice(i, 1);
	}

	kill(i) {
		const unit = this.get(i);
		this.scene.effectManager.explode(unit.position, unit.size, unit.explodeTime);
		this.deathcount++;
		this.remove(i);
	}
}

const loadedunit = {};

function get(n) {
	if (this.loadedunit[n]) return this.loadedunit[n];
	this.loadedunit[n] = {
		mesh: assets.THREE_Model_JSON[n],
		properties: Object.assign(this.units[n].properties, {
			maxhp: 5, maxenergy: 100, armor: 1, size: 1, v: 0, time: 0, sharpness: 1, update: () => {}
		}),
		autospawn: {rep: 1, options: {}}
	};
	if (!this.loadedunit[n].mesh) throw Error(n);
	this.loadedunit[n].mesh.data.geometry.computeBoundingBox();
	this.loadedunit[n].mesh.data.geometry.computeBoundingSphere();
	return this.loadedunit[n];
}

function setQuaternionFromDirectionVector(q, v) {
	const axis = get(Vector3).copy(Axis.z).cross(v).normalize();
	const retquaternion = q.setFromAxisAngle(axis, Math.acos(Axis.z.dot(v)));
	free(axis);
	return retquaternion;
}

export const units = {
	player1: {
		filename: 'fighter',
		properties: {
			myrot: {x: 0, y: 0, z1: 0, z2: 0}, pitch: 0, yaw: 0, v: 5, av: new Vector3(),
			maxenergy: 2000, maxhp: 100, speed: 0.95, rotspeed: 1, weight: 100, hitSphere: 5, excludeFromHitTest: true,
			raycaster: new Raycaster(),
			update(delta) {
				if (this.targetingEnemy && !this.targetingEnemy.parent) {
					this.way = null;
					this.targetingEnemy = null;
				}

				if (Math.abs(this.myrot.x) > Math.PI / 2) this.myrot.z2 += (Math.PI - this.myrot.z2) * (1 - 0.95 ** delta);
				else this.myrot.z2 *= 0.95 ** delta;

				const reverse = this.myrot.z2 > Math.PI / 2;

				const rot = normalizeAngle(
					Math.atan2(mouseY - 0.5 * vy, mouseX - 0.5 * vx) +
					this.myrot.y - this.yaw + (reverse ? Math.PI * 1.5 : Math.PI / 2)
				);
				const maxrot = (0.04 - this.v * 0.001) * this.rotspeed;
				if (Math.abs(rot) > 2.5) this.mode = 'back';
				else {
					if (this.mode === 'back') this.mode = null;
					rot = Math.clamp(rot * 0.07, -maxrot, maxrot);
					this.myrot.z1 += rot * 0.3 * delta;
					this.yaw += rot * delta;
				}

				const direction = get(Vector3);
				direction.copy(Axis.z).applyQuaternion(this.quaternion).normalize();

				if (this.opponents.elements.length !== 0) {
					// Select targeting enemy
					const futurePosition = get(Vector3);
					futurePosition.copy(this.position).addScaledVector(direction, this.v * 5 * delta);
					const futureAngle = get(Quaternion);
					futureAngle.set(0, 0, 0, 1).rotateY(this.myrot.y - this.yaw * 0.5 + ((this.mode === 'back') !== reverse ? Math.PI : 0))
					const futureDirection = get(Vector3);
					futureDirection.copy(Axis.z).applyQuaternion(futureAngle);
					free(futureAngle);
					const futureDistance = get(Vector3);
					const targetingEnemy = this.opponents.elements.reduce((o, enm) => {
						futureDistance.copy(enm.position).sub(futurePosition);
						futureDistance.y = 0;
						const targetingPriority = futureDistance.angleTo(futureDirection);
						if (targetingPriority > Math.PI / (this.mode === 'back' ? 6 : 2)) return o;
						targetingPriority *= futureDistance.length();
						return targetingPriority < o.d ? {d: futureAngle, enm: enm} : o;
					}, {d: Infinity, enm: null}).enm;

					free(futurePosition, futureDirection, futureDistance);
				}

				const shift = keys.ShiftLeft;

				if (this.way === 'up') {
					if (!keys.KeyW) this.way = null;
				} else if (this.way === 'down') {
					if (!keys.KeyS) this.way = null;
				} else {
					if (keys.KeyW) this.way = 'up';
					if (keys.KeyS) this.way = 'down';
				}

				this.targetingEnemy = targetingEnemy;
				if (targetingEnemy) {
					this.targetMarker.visible = true;
					const pos = get(Vector3);
					pos.copy(targetingEnemy.position).project(this.camera);
					this.targetMarker.x = (pos.x + 1) * vw / 2;
					this.targetMarker.y = (1 - pos.y) * vh / 2;
					free(pos);
					this.targetMarker.strokeColor = this.mode === 'back' ? "#a44" : "#444";
				} else this.targetMarker.visible = false;

				maxrot /= 2;

				if (this.position.y < 100 || this.way === 'up') {
					if (reverse) {
						this.pitch += maxrot * (this.mode === 'back' ? 2 : 1 - (this.myrot.x + (this.myrot.x > 0 ? -Math.PI : Math.PI)) / 1.6) * delta;
					} else this.pitch -= maxrot * (this.mode === 'back' ? 2 : -this.myrot.x / 1.6) * delta;
				} else if (this.way === 'down') {
					if (reverse) {
						this.pitch -= maxrot * (this.mode === 'back' ? 2 : 1 + (this.myrot.x + (this.myrot.x > 0 ? -Math.PI : Math.PI)) / 1.6) * delta;
					} else this.pitch += maxrot * (this.mode === 'back' ? 2 : this.myrot.x / 1.6) * delta;
				} else if (targetingEnemy) {
					const v = get(Vector3);
					v.copy(targetingEnemy.position).add(targetingEnemy.geometry.boundingSphere.center).sub(this.position);
					const b = (this.mode === 'back') !== reverse;
					rot = normalizeAngle(Math.atan2(-v.y, Math.sqrt(v.x * v.x + v.z * v.z) * (b ? -1 : 1)) - this.myrot.x - this.pitch);
					free(v);
					this.pitch += Math.clamp(rot * 0.15, -maxrot, maxrot) * delta;
				}

				// Move and rotate
				this.myrot.x += this.pitch * 0.1 * delta;
				this.myrot.y -= this.yaw * 0.1 * delta;
				this.myrot.x = normalizeAngle(this.myrot.x);
				this.myrot.y = normalizeAngle(this.myrot.y);
				this.applyRotation();

				if (p.getPointing()) this.consumeEnergy(this.speed * 3 * delta, () => { // Speed up
					if (this.scene.space) this.av.addScaledVector(direction, this.speed * delta);
					else this.v += this.speed * delta;
				});

				if (!this.scene.space) {
					this.position.addScaledVector(direction, this.v * delta);
					this.scene.shakeScreen((this.v - 5) / 20);
				}
				this.position.addScaledVector(this.av, delta);

				free(direction);

				this.myrot.z1 *= 0.95 ** delta;

				this.yaw *= (0.95 - (Math.PI / 2 - Math.abs(Math.abs(this.myrot.x) - Math.PI / 2)) * 0.1) ** delta;
				this.pitch *= 0.9 ** delta;

				// Speed loss
				if (this.scene.space) this.av.multiplyScalar(0.996 ** delta);
				else {
					this.v *= (0.98 - (this.pitch + this.yaw) * 0.06) ** delta;
					if (this.v < 5) this.v = 5;
					this.av.multiplyScalar(0.98 ** delta);
				}


				if (keys.Space) this.consumeEnergy(1.5, () => {
					this.attack(6);
					this.scene.shakeScreen(2);
				});

				this.sub.forEach(sub => {
					if (sub.active === false) return;
					sub.update();
				});

				if (keys.KeyA) opt(opt(this.sub, shift ? 2 : 0), 'activate')(keyDown.keyA);
				if (keys.KeyD) opt(opt(this.sub, shift ? 3 : 1), 'activate')(keyDown.keyD);

				this.energy = Math.min(this.energy + 2 * delta, this.maxenergy);
				gauge_e.value = this.energy;
				gauge_h.value = this.hp;

				windManager.forEach(wind => {
					const radius = 15 + wind.size;
					if (Math.sqrt(this.position.x * wind.position.x + this.position.z * wind.position.y) <= radius) this.av.y += wind.v / 2;
				});
				// hit vs enemy
				const v = get(Vector3).copy(Axis.z).applyQuaternion(this.quaternion);
				const p = get(Vector3).copy(this.position)
					.addScaledVector(v, -this.geometry.boundingBox.min.z + this.geometry.boundingBox.max.x);
				v.multiplyScalar(this.geometry.boundingBox.getSize().z - this.geometry.boundingBox.getSize().x);
				const enemyPosition = get(Vector3);
				this.opponents.elements.forEach(enemy => {
					enemyPosition.copy(enemy.position).add(enemy.geometry.boundingSphere.center);
					if (testCupsuleSphere(p, v, enemyPosition,
						this.geometry.boundingBox.max.x + enemy.geometry.boundingSphere.radius * enemy.scale.x)) {
						this.scene.shakeScreen(this.v);
						this.hp -= Math.min(enemy.hp, 2.5) * enemy.sharpness / this.armor;
						if (enemy.size < 15) {
							this.scene.score -= 1;
							this.v /= 2;
						}
						enemy.hp -= this.v * this.sharpness / enemy.armor;
					}
				});
				free(v, p, enemyPosition);
				// hit vs obstacle
				obstacleManager.forEach(obstacle => {
					if (testOBBSphere(obstacle.position, this.position, obstacle.size, obstacle.quaternion, this.geometry.boundingBox.max.x)) this.hp = 0;
				});
			},
			getDamage(rawdmg) {
				return rawdmg;
			},
			attack(atk) {
				const a = Math.random() * Math.PI * 2;
				const bullet = this.allies.bulletManager.create('bullet', {v: 15, atk: this.getDamage(atk)});
				const v = get(Vector3);
				v.copy(Axis.z).applyQuaternion(this.quaternion).setLength(this.geometry.boundingBox.max.z);
				bullet.position.copy(this.position).add(v);
				v.set(Math.sin(a), Math.cos(a), 0);
				bullet.quaternion.copy(this.quaternion).rotate(v, Math.sqrt(Math.random() * 0.0009));
				free(v);
			},
			beam(atk, exps, expt, radius, effect) {
				const vec = get(Vector3).copy(Axis.z).applyQuaternion(this.quaternion).normalize();

				// 距離で並べかえる
				this.opponents.elements.sort((a, b) => {
					this.position.distanceToSquared(a.position) - this.position.distanceToSquared(b.position);
				});

				let hit;

				if (radius === 0) {
					this.raycaster.set(this.position, vec);
					this.opponents.elements.forEach(enemy => hit = this.raycaster.intersectObject(enemy).first);
				} else {
					const projectionMatrix = get(Matrix4).makeOrthographic(-radius, radius, radius, -radius, 0, 10000);
					const viewMatrix = get(Matrix4).getInverse(this.matrixWorld);
					const canvas = phina.graphics.Canvas().setSize(radius * 2, radius * 2);

					function matrix4ToString(mat) {
						let str = "";
						for (let i = 0; i < 4; i++) {
							str += "| ";
							for (let j = 0; j < 4; j++) str += mat.elements[i + j * 4] + " ";
							str += "|\n";
						}
						return str;
					}

					const position = get(Vector3);
					const mvpMatrix = get(Matrix4);
					const tmpColor = get(Color);
					this.opponents.elements.forEach((enemy, index) => {
						mvpMatrix.copy(projectionMatrix).multiply(viewMatrix).multiply(enemy.matrixWorld);

						position.copy(enemy.geometry.boundingSphere.center).applyMatrix4(mvpMatrix);
						console.log(enemy.geometry.boundingSphere.center, matrix4ToString(mvpMatrix), position.z)

						if (position.z > 0) {
							console.log(position.x, position.y, enemy.geometry.boundingSphere.radius)
							canvas.fillStyle = tmpColor.set(index + 1).getStyle();
							canvas.fillCircle(position.x + radius, position.y + radius, enemy.geometry.boundingSphere.radius);
						}
					});
					free(position, mvpMatrix, tmpColor, projectionMatrix, viewMatrix);

					const data = canvas.context.getImageData(0, 0, radius * 2 * window.devicePixelRatio, radius * 2 * window.devicePixelRatio).data;
					for (let i = 0; i < data.length; i += 4) {
						const index = data[i] << 16 + data[i + 1] << 8 + data[i + 2];
						if (index !== 0) console.log(index);
					}
				}
				if (hit) {
					this.scene.effectManager.hit(hit.point, exps, expt);
					hit.object.hp -= this.getDamage(atk) / this.scene.difficulty;
				}
				free(vec);
			},
			consumeEnergy(amount, f, defaultreturn) {
				if (this.energy >= amount) {
					this.energy -= amount;
					return f.call(this);
				}
				return defaultreturn;
			},
			applyRotation() {
				this.quaternion.set(0, 0, 0, 1);
				// The order is important, even with quaternion.
				THREE_Utils.rotateY(this, this.myrot.y);
				THREE_Utils.rotateX(this, this.myrot.x);
				THREE_Utils.rotateZ(this, this.myrot.z1 + this.myrot.z2);
			}
		}
	},
	enem1: {
		filename: 'enem-1',
		properties: {
			v: 0.6, chase: 0, firerate: 100, mindist: 0, aim: false, weight: 16, c: new Quaternion(),
			update(delta) {
				this.quaternion.premultiply(this.c);

				const vecToTarget = get(Vector3).copy(this.scene.player.position).sub(this.position);

				const directionVectorToTarget = get(Vector3).copy(vecToTarget).normalize();
				const quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), directionVectorToTarget);
				free(directionVectorToTarget);

				const currentDirection = get(Vector3).copy(Axis.z);
				if (!this.scene.player.position.equals(this.position) && this.chase !== 0) {
					const spd = this.v * (this.mindist !== 0 ? Math.clamp((vecToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
					this.quaternion.slerp(quaternionToTarget, this.chase * delta);
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, spd * delta);
				} else {
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, this.v * delta);
				}
				free(currentDirection, vecToTarget);
				if (this.time % this.firerate === 0) {
					this.allies.bulletManager.create('bullet', {
						position: this.position, quaternion: this.aim ? quaternionToTarget : this.quaternion,
						v: 3.5, atk: 7
					});
				}
				free(quaternionToTarget);
			}
		},
		builds: [
			{value: 1},
			{value: 2, properties: {aim: true}}
		]
	},
	enem2: {
		filename: 'fighter-2',
		properties: {
			hp: 75, v: 5, size: 15, chase: 0.04, sharpness: 2, firerate: 15, explodeTime: 30, weight: 100,
			update(delta) {
				const currentDirection = get(Vector3).copy(Axis.z);
				if (!this.scene.player.position.equals(this.position)) {
					const directionVectorToTarget = get(Vector3).copy(this.scene.player.position).sub(this.position).normalize();
					const quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), directionVectorToTarget);
					this.quaternion.slerp(quaternionToTarget, this.chase * delta);
					free(quaternionToTarget, axis, directionVectorToTarget);

					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, this.v * delta);
				} else currentDirection.applyQuaternion(this.quaternion);

				if (this.time % this.firerate === 0) {
					const bullet = this.allies.bulletManager.create('bullet', {quaternion: this.quaternion, v: 6, size: 1.5, atk: 10});
					bullet.position.copy(this.position).addScaledVector(currentDirection, this.geometry.boundingBox.max.z);
				}
				free(currentDirection);
			}
		},
		builds: [
			{value: 10}
		]
	},
	enem3: {
		filename: 'enem-2',
		properties: {
			hp: 500, v: 0.25, size: 30, firerate: 1, r: 0.1, explodeTime: 30, weight: 250, c: new Quaternion(),
			scale: new Vector3(3, 3, 3),
			update(delta) {
				this.quaternion.premultiply(this.c);
				this.rotateZ(this.r);
				const dir = get(Vector3).copy(Axis.z).applyQuaternion(this.quaternion);
				this.position.addScaledVector(dir, this.v * delta);
				free(dir);
				if (this.time % this.firerate === 0) {
					const bullet = this.allies.bulletManager.create('bullet', {
						position: this.position, v: 2.5, size: 0.5, atk: 5
					});
					bullet.quaternion.copy(this.quaternion).rotate(Axis.x, 0.1 + (Math.PI - 0.1) * (this.time % (this.firerate * 8) / this.firerate / 8) / 20 * (Math.random() + 9));
				}
			}
		},
		builds: [
			{value: 14}
		]
	},
	airballoon: {
		filename: 'airballoon',
		properties: {
			hp: 1000, v: 0.2, size: 40, firerate1: 18, firerate2: 33, explodeTime: 45, weight: 75,
			scale: new Vector3(2, 2, 2),
			update(delta) {
				const dir = get(Vector3).copy(Axis.z).applyQuaternion(this.quaternion).normalize();
				this.position.addScaledVector(dir, this.v * delta);
				free(dir);
				const tmpVector = get(Vector3);
				let bullet;
				if (this.time % this.firerate1 === 0) {
					const params = {quaternion: this.quaternion, v: 3, size: 2.5, atk: 15};
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(7, 0, -24));
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(-7, 0, -24));
				}
				if (this.time % this.firerate2 === 0) {
					const params = {quaternion: this.quaternion, v: 3, size: 2.5, atk: 15};
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(10, -10, -20));
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(-10, -10, -20));
				}
				if (this.time % this.firerate1 === 9) {
					const params = {v: 3, size: 2.5, atk: 15};
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(10, 0, -10));
					bullet.quaternion.copy(this.quaternion).rotateY(1);
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(-10, 0, -10));
					bullet.quaternion.copy(this.quaternion).rotateY(-1);
				}
				if (this.time % this.firerate2 === 11) {
					const params = {v: 3, size: 2.5, atk: 15};
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(10, 0, 0));
					bullet.quaternion.copy(this.quaternion).rotateY(Math.PI / 2);
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(-10, 0, 0));
					bullet.quaternion.copy(this.quaternion).rotateY(-Math.PI / 2);
				}
				if (this.time % this.firerate2 === 22) {
					const params = {v: 3, size: 2.5, atk: 15};
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(10, 0, 20));
					bullet.quaternion.copy(this.quaternion).rotateY(3);
					bullet = this.allies.bulletManager.create('bullet', params);
					bullet.position.copy(this.position).add(tmpVector.set(-10, 0, 20));
					bullet.quaternion.copy(this.quaternion).rotateY(-3);
				}
				free(tmpVector);
			}
		},
		builds: [
			{value: 8}
		]
	},
	blademinion: {
		filename: 'slicer',
		properties: {
			hp: 50, chase: 0.07, v: 7.5, sharpness: 3, size: 5, explodeTime: 30, stealth: true, weight: 25,
			scale: new Vector3(7, 7, 7),
			update(delta) {
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
						const vectorToTarget = get(Vector3).copy(this.target.position).sub(this.position).normalize();
						const quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), vectorToTarget);
						this.quaternion.slerp(quaternionToTarget, this.chase * delta);
						free(quaternionToTarget, vectorToTarget);
					}
					const currentDirection = get(Vector3).copy(Axis.z).applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, this.v * delta);
					free(currentDirection);
				} else {
					this.hp = Math.min(this.hp + 0.01 * delta, 50);
					if (this.base.user.hp <= 0) this.hp = 0;
					this.position.copy(this.base.user.position);
					this.quaternion.copy(this.base.user.quaternion);
				}
				this.stealth = !this.active;
			},
			init() {
				this.addEventListener('targetAttacked', () => {
					this.target = this.base.user;
				});
			}
		}
	},
	assaultdrone: {
		filename: 'assault',
		properties: {
			hp: 10, chase: 0.07, v: 6, bv: 7, atk: 8, sharpness: 1.4, firerate: 28, size: 5, weight: 16,
			mindist: 50, explodeTime: 20, expire: Infinity,
			update(delta) {
				this.expire -= delta;
				if (this.expire <= 0) {
					this.despawn = true;
					return;
				}
				const currentDirection = get(Vector3).copy(Axis.z);
				if (!this.target || this.target.hp <= 0 || !this.target.parent) {
					if (this.opponents.elements.length !== 0) {
						this.target = this.opponents.elements.reduce((o, enm) => {
							const d = enm.position.distanceTo(this.position);
							return d < o.d ? {d: d, enm: enm} : o;
						}, {d: Infinity, enm: null}).enm;
					}
					if (!this.target) {
						currentDirection.applyQuaternion(this.quaternion);
						this.position.addScaledVector(currentDirection, this.v * delta);
						free(currentDirection);
						return;
					}
				}
				if (!this.target.position.equals(this.position) && this.chase !== 0) {
					const vectorToTarget = get(Vector3).copy(this.target.position).sub(this.position).normalize();
					const spd = this.v * (this.mindist !== 0 ? Math.clamp((vectorToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
					const quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), vectorToTarget);
					this.quaternion.slerp(quaternionToTarget, this.chase);
					free(quaternionToTarget, vectorToTarget);
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, spd * delta);
				} else {
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, this.v * delta);
				}
				if (this.time % this.firerate === 0) {
					const bullet = this.allies.bulletManager.createBullet('bullet', {quaternion: this.quaternion, v: this.bv, atk: this.atk});
					bullet.position.copy(this.position).addScaledVector(currentDirection, this.geometry.boundingBox.max.z);
				}
				free(currentDirection);
			}
		}
	}
};

export const builds = [];
Object.keys(units).forEach(key => {
	if (units[key].builds) units[key].builds.forEach(build => builds.push(Object.assign({name: key}, build)));
});
