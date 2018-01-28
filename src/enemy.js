phina.define('EnemyManager', {
	superClass: 'SimpleUpdater',

	enemyraders: [], groups: [],
	killcount: 0, allcount: 0,

	init: function(s, ts, bh, ms) {
		this.superInit();
		this.scene = s;
		this.threescene = ts;
		this.gauge_boss_h = bh;
		this.message = ms;
	},

	create: function() {
		this.allcount++;
		this._create.apply(this, arguments);
	},

	_create: function(n, r, g, t, p) {
		if(p) {
			var func = function(e) {
				if (e.progress > p) {
					this._create(n, r, g, t);
					this.off('frame', func)
				}
			}
			this.on('frame', func);
		} else if (t) this.on('frame' + (this.scene.frame + t), this._create.bind(this, n, r, g));
		else {
			var enemy = UnitManager.get(n).mesh.get(false, true);
			THREE.$extend(enemy, UnitManager.get(n).routine);
			THREE.$extend(enemy, r);
			enemy.summons = this;
			enemy.group = g;
			this.threescene.add(enemy);
			this.elements.push(enemy);
			var rader = phina.display.CircleShape({radius: 3, fill: 'hsla(0, 80%, 60%, 0.5)', stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1}).addChildTo(this.scene);
			var xdist = (this.player.position.x - enemy.position.x);
			var zdist = (this.player.position.z - enemy.position.z);
			var distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25, 75);
			var angle = Math.atan2(xdist, zdist) - this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
			rader.setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
			this.enemyraders.push(rader);
			if (enemy.stealth) rader.hide();
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
	createMulti: function(n, r, as, km) {
		var autospawn = as.$safe(UnitManager.get(n).autospawn);
		this.groups.push({num: autospawn.rep, message: km});
		if (r.boss) {this.scene.bossdefeated = false;}
		for(var i = 0; i < autospawn.rep; i++) {
			var nr = {position: new THREE.Vector3()};
			THREE.$extend(nr, r);
			this.create(n, nr, this.groups.last, autospawn.time, autospawn.progress);
			if (autospawn.delay) {autospawn.time += autospawn.delay;}
			THREE.$add(r, autospawn.options);
			r.position.add(new THREE.Vector3(
				Math.random() * autospawn.random.x * 2 - autospawn.random.x,
				Math.random() * autospawn.random.y * 2 - autospawn.random.y,
				Math.random() * autospawn.random.z * 2 - autospawn.random.z));
		}
	},

	update: function() {
		this.each(function(enemy, i) {
			this.opponents.bulletManager.hitTest(enemy);
			this.opponents.elements.each(function(ally) {
				if (enemy.position.clone().sub(ally.position).length() < enemy.geometry.boundingSphere.radius + ally.size) {
					if (enemy === ally.target) ally.targetAttacked();
					enemy.hp -= Math.min(ally.hp, 2.5) / this.scene.difficulty * ally.sharpness / enemy.armor;
					ally.hp -= 2.5 * this.scene.difficulty * enemy.sharpness / ally.armor;
				}
			}, this);
			enemy.update(this);
			if (enemy.despawn) {
				this.removeEnemy(i);
				return;
			}
			if (enemy.hp <= 0) {
				this.kill(i);
				return;
			}
			enemy.time++;
			var xdist = (this.player.position.x - enemy.position.x);
			var zdist = (this.player.position.z - enemy.position.z);
			var distance = Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25;
			if (enemy.stealth || distance > 100) {
				this.enemyraders[i].hide();
				return;
			}
			this.enemyraders[i].show();
			var distance = Math.min(distance, 75);
			var angle = Math.atan2(xdist, zdist);
			this.enemyraders[i].setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
		}, this);
	},

	removeEnemy: function(i) {
		var enemy = this.get(i);
		if (enemy.group) {
			enemy.group.num--;
			if (enemy.group.num === 0 && enemy.group.message) {
				var text = enemy.group.message.text;
				if (enemy.group.message.offkill) {this.message.text = '';}
				if (text !== '') {
					this.on('frame' + (this.scene.frame + (enemy.group.message.time - 5)), function() 	{this.message.text = '';});
					this.on('frame' + (this.scene.frame + enemy.group.message.time), function() 	{this.message.text = text;});
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
		this.effectManager.explode(this.get(i).position, this.get(i).size, this.get(i).explodeTime);
		this.scene.score += this.get(i).size;
		this.killcount++;
		this.removeEnemy(i);
	}
});
