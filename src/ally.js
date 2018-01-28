phina.define('AllyManager', {
	superClass: 'SimpleUpdater',

	allyraders: [], deathcount: 0,

	init: function(s, ts) {
		this.superInit();
		this.scene = s;
		this.threescene = ts;
	},
	create: function(n, r, t, p) {
		if(p) {
			var func = function(e) {
				if (e.progress > p) {
					this.create(n, r, t);
					this.off('frame', func)
				}
			}
			this.on('frame', func);
		} else if (t) this.on('frame' + (this.scene.frame + t), this.create.bind(this, n, r));
		else {
			var unit = UnitManager.get(n).mesh.get(false, true);
			THREE.$extend(unit, UnitManager.get(n).routine);
			THREE.$extend(unit, r);
			unit.summons = this;
			this.threescene.add(unit);
			this.elements.push(unit);
			var rader = phina.display.CircleShape({radius: 3, fill: 'hsla(210, 80%, 60%, 0.5)', stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1}).addChildTo(this.scene);
			var xdist = (this.player.position.x - unit.position.x);
			var zdist = (this.player.position.z - unit.position.z);
			var distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25, 75);
			var angle = Math.atan2(xdist, zdist) - this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
			rader.setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
			this.allyraders.push(rader);
			if (unit.stealth) rader.hide();
			return unit;
		}
	},
	createMulti: function(n, r, as, km) {
		var autospawn = as.$safe(UnitManager.get(n).autospawn);
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
		this.each(function(unit, i) {
			this.opponents.bulletManager.hitTest(unit);
			unit.update(this);
			if (unit.despawn) {
				this.removeAlly(i);
				return;
			}
			if (unit.hp <= 0) {
				this.kill(i);
				return;
			}
			unit.time++;
			var xdist = (this.player.position.x - unit.position.x);
			var zdist = (this.player.position.z - unit.position.z);
			var distance = Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25;
			if (unit.stealth || distance > 100) {
				this.allyraders[i].hide();
				return;
			}
			this.allyraders[i].show();
			var distance = Math.min(distance, 75);
			var angle = Math.atan2(xdist, zdist);
			this.allyraders[i].setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
		}, this);
	},

	removeAlly: function(i) {
		var ally = this.get(i);
		ally.parent.remove(ally);
		THREE.applyToAllMaterial(ally.material, function(m) {m.dispose();});
		this.remove(i);
		this.allyraders[i].remove();
		this.allyraders.splice(i, 1);
	},

	kill: function(i) {
		var ally = this.get(i);
		this.effectManager.explode(ally.position, ally.size, ally.explodeTime);
		this.deathcount++;
		this.removeAlly(i);
	}
});
