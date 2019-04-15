import {Vector3, Quaternion, Ray, Raycaster, Plane} from "three";

import * as THREE_Utils from "w3g/threeutil";
import {normalizeAngle, opt, get, free} from "w3g/utils";
import {vw, vh} from "w3g/main";
import assets, {addFile} from "w3g/loading";
import {mouseX, mouseY, keys, keyDown, pointing} from "w3g/input";
import {SymmetricTriangle} from "w3g/geometries";

import {minimapScale, raderRadius, bossHPGaugeFadeTime} from "./constants";
import ElementManager from "./elementmanager";
import {testOBBSphere, testCupsuleSphere} from "./collision";
import {ActiveSkill} from "./skills";

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
 * time 			time since spawn(milliseconds)
 * target			refer to a enemy unit used to trigger targetAttacked(optional)
 * summons		refer to the UnitManager instance that have created the unit.
 * stealth		unit with this property true never shown in the rader
 * despawn		set this property to true will cause despawning of the unit without any death trigger.
 *						will be checked after each update.
 * --size--
 *
 * ===== methods =====
 *
 * update						the update routine will called each frame, and recieves this.summons to first argument
 */

export class UnitManager extends ElementManager {

	groups = [];
	spawncount = 0;
	deathcount = 0;

	constructor(s, bm, rc) {
		super();
		this.scene = s;
		this.bulletManager = bm;
		this.raderColor = rc;
	}

	create(build, position, quaternion, group, delay, targetProgress) {
		if (typeof build === "string") build = {name: build};
		if (targetProgress) {
			const checkForProgress = e => {
				if (this.scene.progress > targetProgress) {
					this.create(name, properties, group, delay);
					this.removeEventListener('update', checkForProgress);
				}
			};
			this.addEventListener('update', checkForProgress);
		} else if (delay) window.setTimeout(() => this.create(name, properties), delay);
		else {
			this.spawncount++;
			const unit = THREE_Utils.deepclone(getUnit(build.name).mesh, false, true);
			Object.assign(unit, getUnit(build.name).properties, build.properties);
			if (position) unit.position.copy(position);
			if (quaternion) unit.quaternion.copy(quaternion);
			if (!unit.hp) unit.hp = unit.maxhp;
			if (!unit.energy) unit.energy = unit.maxenergy;
			unit.allies = this;
			unit.opponents = this.opponents;
			unit.scene = this.scene;
			if (group) {
				unit.group = group;
				group.size++;
			}
			if (unit.init) unit.init();
			this.scene.threeScene.add(unit);
			this.elements.push(unit);
			this.scene.minimap.addObject(unit, unit.isPlayer ? new SymmetricTriangle({
				fillColor: 'hsl(0, 50%, 70%)', strokeColor: 'black', opacity: 0.5,
				strokeWidth: 1, rotation: Math.PI, width: 5, height: 8
			}) : {fillColor: this.raderColor}).visible = !unit.stealth;
			return unit;
		}
	}

	createMulti(build, position, quaternion, autospawn, km) {
		if (typeof build === "string") build = {name: build};
		autospawn = Object.assign(getUnit(build.name).autospawn, autospawn);
		const group = {size: 0, message: km};
		this.groups.push(group);
		const pos = get(Vector3).copy(position);
		for(let i = 0; i < autospawn.rep; i++) {
			this.create(build, pos, quaternion, group, autospawn.time, autospawn.progress);
			if (autospawn.delay) {autospawn.time += autospawn.delay;}
			//THREE.$add(properties, autospawn.options);
			pos.x += Math.random() * autospawn.random.x * 2 - autospawn.random.x;
			pos.y += Math.random() * autospawn.random.y * 2 - autospawn.random.y;
			pos.z += Math.random() * autospawn.random.z * 2 - autospawn.random.z;
		}
		free(pos);
	}

	update(delta) {
		this.dispatchEvent({type: "update"});
		this.forEach((unit, i) => {
			this.opponents.bulletManager.hitTest(unit);
			if (unit.despawn) {
				this.remove(i);
				return;
			}
			if (unit.hp <= 0) {
				this.kill(i);
				return;
			}
			unit.time += delta;
			this.scene.minimap.getObject(unit).visible = !unit.stealth;
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
		THREE_Utils.applyToAllMaterials(unit.material, m => m.dispose());
		super.remove(i);
		this.scene.minimap.removeObject(unit);
	}

	kill(i) {
		const unit = this.get(i);
		this.scene.effectManager.explode(unit.position, unit.size, unit.explodeTime);
		this.deathcount++;
		this.remove(i);
	}
}

const loadedunit = {};

function setQuaternionFromDirectionVector(q, v) {
	const axis = get(Vector3).copy(THREE_Utils.Axis.z).cross(v).normalize();
	const retquaternion = q.setFromAxisAngle(axis, Math.acos(THREE_Utils.Axis.z.dot(v)));
	free(axis);
	return retquaternion;
}

export const units = {
	player1: {
		filename: 'fighter-1',
		maxCost: 1500,
		properties: {
			pitch: 0, yaw: 0, v: 0.17,
			maxenergy: 2000, maxhp: 100, speed: 0.001, minspeed: 0.17, rotspeed: 1, weight: 100, hitSphere: 5,
			isPlayer: true, excludeFromHitTest: true, explodeTime: 1000,
			init() {
				this.myrot = {x: 0, y: 0, z1: 0, z2: 0};
				this.av = new Vector3();
				this.raycaster = new Raycaster();
				this.targetingPosition = new Vector3();
			},
			update(delta) {
				const reverse = this.myrot.z2 > Math.PI / 2;
				const maxrot = (0.0017 - this.v * 0.001) * this.rotspeed;

				if (Math.abs(this.myrot.x) > Math.PI / 2) this.myrot.z2 += (Math.PI - this.myrot.z2) * (1 - 0.95 ** delta);
				else this.myrot.z2 *= 0.95 ** delta;

				this.targetingPosition.set(mouseX / vw * 2 - 1, -mouseY / vh * 2 + 1, 0).unproject(this.scene.camera);
				const targetingDirection = get(Vector3).copy(this.targetingPosition).sub(this.scene.camera.position).normalize();
				const targetingRay = get(Ray).set(this.scene.camera.position, targetingDirection);
				free(targetingDirection);

				let targetingEnemy, targetingEnemyPosition;
				if (this.opponents.elements.length !== 0) {
					const enemyPosition = get(Vector3);
					// Select targeting enemy
					({enm: targetingEnemy, pos: targetingEnemyPosition} = this.opponents.elements.reduce((o, enm) => {
						enemyPosition.copy(enm.position).add(enm.geometry.boundingSphere.center);
						let targetingPriority = targetingRay.distanceToPoint(enemyPosition);
						if (targetingPriority > Math.max(enm.geometry.boundingSphere.radius * enm.scale.x * 3, 20)) return o;
						if (targetingPriority < o.d) {
							o.d = targetingPriority;
							o.enm = enm;
							o.pos.copy(enemyPosition);
						}
						return o;
					}, {d: Infinity, enm: null, pos: get(Vector3)}));
					free(enemyPosition);
				}
				if (targetingEnemy) this.targetingPosition.copy(targetingEnemyPosition);
				else {
					const plane = get(Plane).set(THREE_Utils.Axis.y, -this.position.y);
					targetingRay.intersectPlane(plane, this.targetingPosition);
					free(plane);
				}
				if (this.opponents.elements.length !== 0) free(targetingEnemyPosition);
				// targetingRay.closestPointToPoint(this.position, targetingPosition);

				const pos = get(Vector3).copy(this.targetingPosition).project(this.scene.camera);
				this.targetMarker.position.set(pos.x * vw / 2, pos.y * vh / 2, 0);
				free(pos);
				this.targetMarker.strokeColor = this.mode === 'back' ? "#a44" : "#444";

				if (this.position.y < 100) {
					if (reverse) {
						this.pitch += maxrot * (this.mode === 'back' ? 2 : 1 - (this.myrot.x + (this.myrot.x > 0 ? -Math.PI : Math.PI)) / 1.6) * delta;
					} else this.pitch -= maxrot * (this.mode === 'back' ? 2 : -this.myrot.x / 1.6) * delta;
				} else {
					const d = get(Vector3).copy(this.targetingPosition).sub(this.position);
					this.scene.debugText('targetingPosition', `targetingPosition: {x: ${d.x.toFixed(2)}, y: ${d.y.toFixed(2)}, z: ${d.z.toFixed(2)}}`);
					const b = (this.mode === 'back') !== reverse ? -1 : 1;
					const pitch = normalizeAngle(Math.atan2(-d.y, Math.sqrt(d.x * d.x + d.z * d.z) * b) - this.myrot.x - this.pitch);
					const yaw = normalizeAngle(Math.atan2(d.x, d.z) * b + Math.PI - this.myrot.y);
					free(d);
					this.pitch += Math.min(Math.max(pitch * 1.5, -maxrot), maxrot) * delta;
					this.yaw += Math.min(Math.max(yaw * 1.5, -maxrot), maxrot) * delta;
				}

				free(targetingRay);

				const direction = get(Vector3).copy(THREE_Utils.Axis.z).applyQuaternion(this.quaternion).normalize();

				/*if (this.targetingEnemy && !this.targetingEnemy.parent) {
					this.way = null;
					this.targetingEnemy = null;
				}

				let rot = normalizeAngle(
					Math.atan2(mouseY - 0.5 * vh, mouseX - 0.5 * vw) +
					this.myrot.y - this.yaw + (reverse ? Math.PI * 1.5 : Math.PI / 2)
				);

				if (Math.abs(rot) > 2.5) this.mode = 'back';
				else {
					if (this.mode === 'back') this.mode = null;
					rot = Math.min(Math.max(rot * 0.003, -maxrot), maxrot);
					this.myrot.z1 += rot * 0.3 * delta;
					this.yaw += rot * delta;
				}

				this.targetingEnemy = targetingEnemy;
				if (targetingEnemy) {
					this.targetMarker.visible = true;
					const pos = get(Vector3).copy(targetingEnemy.position).project(this.scene.camera);
					this.targetMarker.position.set(pos.x * vw / 2, pos.y * vh / 2, 0);
					free(pos);
					this.targetMarker.strokeColor = this.mode === 'back' ? "#a44" : "#444";
				} else this.targetMarker.visible = false;


				if (this.position.y < 100 || this.way === 'up') {
					if (reverse) {
						this.pitch += maxrot * (this.mode === 'back' ? 2 : 1 - (this.myrot.x + (this.myrot.x > 0 ? -Math.PI : Math.PI)) / 1.6) * delta;
					} else this.pitch -= maxrot * (this.mode === 'back' ? 2 : -this.myrot.x / 1.6) * delta;
				} else if (this.way === 'down') {
					if (reverse) {
						this.pitch -= maxrot * (this.mode === 'back' ? 2 : 1 + (this.myrot.x + (this.myrot.x > 0 ? -Math.PI : Math.PI)) / 1.6) * delta;
					} else this.pitch += maxrot * (this.mode === 'back' ? 2 : this.myrot.x / 1.6) * delta;
				}*/

				// Move and rotate
				this.myrot.x += this.pitch * 0.004 * delta;
				this.myrot.y -= this.yaw * 0.004 * delta;
				this.myrot.x = normalizeAngle(this.myrot.x);
				this.myrot.y = normalizeAngle(this.myrot.y);
				this.applyRotation();

				if (pointing) this.consumeEnergy(this.speed * 3 * delta, () => { // Speed up
					if (this.scene.space) this.av.addScaledVector(direction, this.speed * delta);
					else this.v += this.speed * delta;
				});

				if (!this.scene.space) {
					this.position.addScaledVector(direction, this.v * delta);
					this.scene.shakeScreen((this.v - this.minspeed) * 1.5);
				}
				this.position.addScaledVector(this.av, delta);

				free(direction);

				this.myrot.z1 *= 0.995 ** delta;

				this.yaw *= (0.995 - (Math.PI / 2 - Math.abs(Math.abs(this.myrot.x) - Math.PI / 2)) * 0.01) ** delta;
				this.pitch *= 0.99 ** delta;

				// Speed loss
				if (this.scene.space) this.av.multiplyScalar(0.9996 ** delta);
				else {
					this.v *= (0.999 - (this.pitch + this.yaw) * 0.003) ** delta;
					if (this.v < this.minspeed) this.v = this.minspeed;
					this.av.multiplyScalar(0.998 ** delta);
				}

				if (this.primary instanceof ActiveSkill) {
					if (keys.Space) this.primary.activate();
				} else if (this.primary) this.primary.active = keys.Space;
				this.sub.forEach(sub => {
					if (sub.active === false) return;
					sub.update();
				});

				if (keyDown.KeyZ) this.player.sub.some(sub => {
					if ((sub instanceof ActiveSkill) && sub !== this.player.primary) return sub.activate();
				});

				this.energy = Math.min(this.energy + 2 * delta, this.maxenergy);
				this.scene.gauge_e.value = this.energy;
				this.scene.gauge_h.value = this.hp;

				this.scene.windManager.forEach(wind => {
					const radius = 15 + wind.size;
					if (Math.sqrt(this.position.x * wind.position.x + this.position.z * wind.position.y) <= radius) this.av.y += wind.v / 2;
				});
				// hit vs enemy
				const t = get(Vector3);
				const v = get(Vector3).copy(THREE_Utils.Axis.z).applyQuaternion(this.quaternion);
				const p = get(Vector3).copy(this.position)
					.addScaledVector(v, -this.geometry.boundingBox.min.z + this.geometry.boundingBox.max.x);
				v.multiplyScalar(this.geometry.boundingBox.getSize(t).z - this.geometry.boundingBox.getSize(t).x);
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
				free(v, p, t, enemyPosition);
				// hit vs obstacle
				this.scene.obstacleManager.forEach(obstacle => {
					if (testOBBSphere(obstacle.position, this.position, obstacle.size, obstacle.quaternion, this.geometry.boundingBox.max.x)) this.hp = 0;
				});
			},
			getDamage(rawdmg) {
				return rawdmg;
			},
			beam(atk, exps, expt, radius, effect) {
				const vec = get(Vector3).copy(THREE_Utils.Axis.z).applyQuaternion(this.quaternion).normalize();

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
			v: 0.02, chase: 0, firerate: 100, mindist: 0, aim: false, weight: 16, c: new Quaternion(),
			update(delta) {
				this.quaternion.premultiply(this.c);

				let quaternionToTarget;
				let vecToTarget;
				if (this.scene.player) {
					vecToTarget = get(Vector3).subVectors(this.scene.player.position, this.position);
					const directionVectorToTarget = get(Vector3).copy(vecToTarget).normalize();
					quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), directionVectorToTarget);
					free(directionVectorToTarget);
				}

				const currentDirection = get(Vector3).copy(THREE_Utils.Axis.z);
				if (this.scene.player && this.chase !== 0 && !this.scene.player.position.equals(this.position)) {
					const spd = this.v * (this.mindist !== 0 ? Math.clamp((vecToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
					this.quaternion.slerp(quaternionToTarget, 1 - this.chase ** delta);
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, spd * delta);
				} else {
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, this.v * delta);
				}
				free(currentDirection);
				if (vecToTarget) free(vecToTarget);
				if (this.time % this.firerate === 0) {
					this.allies.bulletManager.create('bullet', this.position,
						this.aim && quaternionToTarget ? quaternionToTarget : this.quaternion,
						{v: 0.12, atk: 7}
					);
				}
				if (quaternionToTarget) free(quaternionToTarget);
			}
		},
		builds: [
			{value: 1},
			{value: 2, properties: {aim: true}},
			{value: 2, properties: {chase: 0.002}}
		]
	},
	enem2: {
		filename: 'fighter-2',
		properties: {
			hp: 75, v: 0.17, size: 15, chase: 0.0014, sharpness: 2, firerate: 15, explodeTime: 900, weight: 100,
			update(delta) {
				const currentDirection = get(Vector3).copy(THREE_Utils.Axis.z);
				if (this.scene.player && !this.scene.player.position.equals(this.position)) {
					const directionVectorToTarget = get(Vector3)
						.subVectors(this.scene.player.position, this.position).normalize();
					const quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), directionVectorToTarget);
					this.quaternion.slerp(quaternionToTarget, 1 - this.chase ** delta);
					free(quaternionToTarget, directionVectorToTarget);

					currentDirection.applyQuaternion(this.quaternion);
				} else currentDirection.applyQuaternion(this.quaternion);

				this.position.addScaledVector(currentDirection, this.v * delta);

				if (this.time % this.firerate === 0) {
					const v = get(Vector3).copy(this.position)
						.addScaledVector(currentDirection, this.geometry.boundingBox.max.z);
					this.allies.bulletManager.create('bullet', v, this.quaternion,
						{v: 0.2, size: 1.5, atk: 10}
					);
					free(v);
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
			hp: 500, v: 0.008, size: 30, firerate: 1, r: 0.001, explodeTime: 900, weight: 250, c: new Quaternion(),
			init() {
				this.scale.setScalar(3);
			},
			update(delta) {
				this.quaternion.premultiply(this.c);
				this.rotateZ(this.r * delta);
				const dir = get(Vector3).copy(THREE_Utils.Axis.z).applyQuaternion(this.quaternion);
				this.position.addScaledVector(dir, this.v * delta);
				free(dir);
				if (this.time % this.firerate === 0) {
					const q = get(Quaternion).copy(this.quaternion);
					THREE_Utils.rotateX(q,
						0.1 + (Math.PI - 0.1) * (this.time % (this.firerate * 8) / this.firerate / 8) / 20 * (Math.random() + 9));
					this.allies.bulletManager.create('bullet', this.position, q, {v: 0.12, size: 0.5, atk: 5});
					free(q);
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
			hp: 1000, v: 0.007, size: 40, firerate1: 18, firerate2: 33, explodeTime: 1200, weight: 75,
			init() {
				this.scale.setScalar(2);
			},
			update(delta) {
				const dir = get(Vector3).copy(THREE_Utils.Axis.z).applyQuaternion(this.quaternion).normalize();
				this.position.addScaledVector(dir, this.v * delta);
				free(dir);
				const tmpVector = get(Vector3);
				const tmpQuaternion = get(Quaternion);
				if (this.time % this.firerate1 === 0) {
					const params = {v: 0.1, size: 2.5, atk: 15};
					this.allies.bulletManager.create('bullet',
						tmpVector.set(7, 0, -24).add(this.position), this.quaternion, params);
					tmpVector.x -= 14;
					this.allies.bulletManager.create('bullet', tmpVector, this.quaternion, params);
				}
				if (this.time % this.firerate2 === 0) {
					const params = {v: 0.1, size: 2.5, atk: 15};
					this.allies.bulletManager.create('bullet',
						tmpVector.set(10, -10, -20).add(this.position), this.quaternion, params);
					tmpVector.x -= 20;
					this.allies.bulletManager.create('bullet', tmpVector, this.quaternion, params);
				}
				if (this.time % this.firerate1 === 9) {
					const params = {v: 0.1, size: 2.5, atk: 15};
					THREE_Utils.rotateY(tmpQuaternion.copy(this.quaternion), 1);
					this.allies.bulletManager.create('bullet',
						tmpVector.set(10, 0, -10).add(this.position), tmpQuaternion, params);
					THREE_Utils.rotateY(tmpQuaternion, -2);
					tmpVector.x -= 20;
					this.allies.bulletManager.create('bullet', tmpVector, tmpQuaternion, params);
				}
				if (this.time % this.firerate2 === 11) {
					const params = {v: 0.1, size: 2.5, atk: 15};
					THREE_Utils.rotateY(tmpQuaternion.copy(this.quaternion), Math.PI / 2);
					this.allies.bulletManager.create('bullet',
						tmpVector.set(10, 0, 0).add(this.position), tmpQuaternion, params);
					THREE_Utils.rotateY(tmpQuaternion, -Math.PI);
					tmpVector.x -= 20;
					this.allies.bulletManager.create('bullet', tmpVector, tmpQuaternion, params);
				}
				if (this.time % this.firerate2 === 22) {
					const params = {v: 0.1, size: 2.5, atk: 15};
					THREE_Utils.rotateY(tmpQuaternion.copy(this.quaternion), 3);
					this.allies.bulletManager.create('bullet',
						tmpVector.set(10, 0, 20).add(this.position), tmpQuaternion, params);
					THREE_Utils.rotateY(tmpQuaternion, -6);
					tmpVector.x -= 20;
					this.allies.bulletManager.create('bullet', tmpVector, tmpQuaternion, params);
				}
				free(tmpVector, tmpQuaternion);
			}
		},
		builds: [
			{value: 8}
		]
	},
	blademinion: {
		filename: 'slicer',
		properties: {
			hp: 50, chase: 0.0024, v: 0.25, sharpness: 3, size: 5, explodeTime: 800, stealth: true, weight: 25,
			init() {
				this.scale.setScalar(7);
			},
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
						const directionToTarget = get(Vector3).subVectors(this.target.position, this.position).normalize();
						const quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), directionToTarget);
						this.quaternion.slerp(quaternionToTarget, 1 - this.chase ** delta);
						free(quaternionToTarget, directionToTarget);
					}
					const currentDirection = get(Vector3).copy(THREE_Utils.Axis.z).applyQuaternion(this.quaternion);
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
			hp: 10, chase: 0.0024, v: 0.2, bv: 0.24, atk: 8, sharpness: 1.4, firerate: 28, size: 5, weight: 16,
			mindist: 50, explodeTime: 600, expire: Infinity,
			update(delta) {
				this.expire -= delta;
				if (this.expire <= 0) {
					this.despawn = true;
					return;
				}
				const currentDirection = get(Vector3).copy(THREE_Utils.Axis.z);
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
					const vectorToTarget = get(Vector3).subVectors(this.target.position, this.position).normalize();
					const spd = this.v * (this.mindist !== 0 ? Math.clamp((vectorToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
					const quaternionToTarget = setQuaternionFromDirectionVector(get(Quaternion), vectorToTarget);
					this.quaternion.slerp(quaternionToTarget, 1 - this.chase ** delta);
					free(quaternionToTarget, vectorToTarget);
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, spd * delta);
				} else {
					currentDirection.applyQuaternion(this.quaternion);
					this.position.addScaledVector(currentDirection, this.v * delta);
				}
				if (this.time % this.firerate === 0) {
					const v = get(Vector3).copy(this.position).addScaledVector(currentDirection, this.geometry.boundingBox.max.z);
					const bullet = this.allies.bulletManager.createBullet('bullet', v, this.quaternion,
						{v: this.bv, atk: this.atk});
					free(v);
				}
				free(currentDirection);
			}
		}
	}
};

function getUnit(name) {
	if (!loadedunit[name]) {
		loadedunit[name] = {
			mesh: assets.THREE_Model_GLTF[name],
			properties: Object.assign({
				maxhp: 5, maxenergy: 100, armor: 1, size: 1, v: 0, time: 0, sharpness: 1, update: () => {}
			}, units[name].properties),
			autospawn: {rep: 1, options: {}}
		};
		if (!loadedunit[name].mesh) throw new Error(`Mesh ${name} not found`);
		loadedunit[name].mesh.geometry.computeBoundingBox();
		loadedunit[name].mesh.geometry.computeBoundingSphere();
	}
	return loadedunit[name];
}
const unitnames = Object.keys(units);
unitnames.forEach(name => addFile('THREE_Model_GLTF', name, `data/models/${units[name].filename}.glb`));
export const builds = unitnames.filter(name => units[name].builds)
	.flatMap(name => units[name].builds.map(build => Object.assign({name: name}, build)));
