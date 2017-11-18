import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Vector } from './vector';
import { Body } from './body';
import { config } from './config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {

  mainWindowWidth = window.innerWidth;
  mainWindowHeight = window.innerHeight;

  // simulation parameters
  dt = 0.005;
  g = 6;
  v0 = 3.3;

  // simulation storage
  bodies = [];
  distance = [];
  relative_vector = [];

  // user interface variables
  camera = Vector.zero();
  zoom = 1/64;
  collisions = true;
  follow = 0;
  labels = true;
  running = true;

  // user interface parameters
  K = 40;

  // computed quantities
  t = 0;
  step_time = 0;
  frac = 0;
  total_mass = 0;
  num_bodies = 0;
  planet_index = 0;
  bins = [];

  // configuration
  system = config;

  ngOnInit() {

    for ( var i=0; i<this.system.length; i++ ) {

      this.system[i].index = this.bodies.length;
      let temp = this.make_system(this.system[i]);

      if ( i != 0 ) {
        let v = new Vector(Math.sin(this.system[i].theta),-Math.cos(this.system[i].theta));
        for(var j=0; j<temp.length; j++ ) {
          temp[j].velocity.add_scaled(Math.sqrt(this.g*this.system[0].mass),v);
        }
      }

      this.bodies = this.bodies.concat(temp);

      this.compute_histogram();

    }

    // this.bodies = this.bodies.concat(this.make_comets(25));

    this.num_bodies = this.bodies.length;

    this.camera = Vector.copy(this.bodies[this.follow].position);
    this.initialize_matrices();
    setInterval(() => { this.main_loop() } ,1);

  }

  get num() {
    return this.bodies.length;
  }

  initialize_matrices() {
    this.distance = Array(this.num).fill(0);
    for (var i=0; i<this.num; i++ ) {
      this.distance[i] = Array(this.num).fill(0);
    }

    this.relative_vector = Array(this.num);
    for (var i=0; i<this.num; i++ ) {
      this.relative_vector[i] = Array(this.num);
    }

    for (var i=0; i<this.num; i++ ) {
      for (var j=0; j<this.num; j++ ) {
        this.relative_vector[i][j] = new Vector(i,j);
      }
    }
  }

  compute_distances() {
    for ( var i=0; i<this.num; i++ ) {
      for ( var j=i+1; j<this.num; j++ ) {
        if ( !this.bodies[i].absorbed && !this.bodies[j].absorbed ) {
          this.relative_vector[i][j].set(this.bodies[j].position).sub(this.bodies[i].position);
          this.relative_vector[j][i].set(this.relative_vector[i][j]).negate();
          this.distance[i][j] = this.relative_vector[i][j].magnitude;
          this.distance[j][i] = this.distance[i][j];
        }
      }
    }
  }

  find_collisions() {
    if ( this.collisions ) {
      for ( var i=0; i<this.num; i++ ) {
        if ( !this.bodies[i].absorbed ) {
          for ( var j=i+1; j<this.num; j++ ) {
            if ( !this.bodies[j].absorbed && this.distance[i][j] < 1 + this.bodies[i].radius + this.bodies[j].radius ) {
              var I, J;
              if ( this.bodies[i].mass > this.bodies[j].mass ) {
                I = i;
                J = j;
              } else {
                I = j;
                J = i;
              }
              this.bodies[J].absorbed = true;
              if ( this.follow == J ) {
                this.follow = I;
              }
              this.bodies[I].just_collided = 25;
              let p = this.bodies[I].position;
              let s = 1 / ( this.bodies[I].mass + this.bodies[J].mass );
              this.bodies[I].velocity.set(this.bodies[I].momentum).add(this.bodies[J].momentum).scale(s);
              this.bodies[I].position.lin_comb(
                this.bodies[I].mass,
                this.bodies[I].position,
                this.bodies[J].mass,
                this.bodies[J].position).scale(s);
              this.bodies[I].mass += this.bodies[J].mass;
              this.bodies[I].radius_from_mass();
              this.compute_histogram()
            }
          }
        }
      }
    }
  }

  compute_histogram() {
    let log_sizes = this.bodies.filter(b => !b.absorbed).map(b => Math.log10(b.mass));
    let min = Math.min.apply(null,log_sizes)
    let max = Math.max.apply(null,log_sizes);
    this.bins = [];
    for ( var i=0; i<21; i++ ) {
      this.bins[i] = { value: min + i*(max-min)/20, number: 0 }
    }
    for ( var i=0; i<20; i++ ) {
      this.bins[i].number = log_sizes.filter ( s => this.bins[i].value <= s && s < this.bins[i+1].value ).length;
    }
  }

  dynamics() {
    this.num_bodies = 0;
    for ( var i=0; i<this.num; i++ ) {
      if ( !this.bodies[i].absorbed ) {
        this.num_bodies++;
        this.bodies[i].acceleration.clear();
        for ( var j=0; j<this.num; j++ ) {
          if ( i != j && !this.bodies[j].absorbed ) {
            let s = this.g * this.bodies[j].mass / ( Math.pow(this.distance[i][j],2) + 0.001 );
            this.bodies[i].acceleration.add_scaled(s,this.relative_vector[i][j]);
          }
        }
      }
    }

    for ( var i=0; i<this.num; i++ ) {
      if ( this.t%3 == 0 && !this.bodies[i].absorbed && this.bodies[i].just_collided > 0 ) {
        this.bodies[i].just_collided -= 1;
      }
      this.bodies[i].integrate(this.dt);
    }
  }

  make_system(config) {

    let p = new Vector(config.r*Math.cos(config.theta), config.r*Math.sin(config.theta));
    let main_body = new Body(p, config.mass)
    main_body.name = config.name;
    let bodies = [main_body];
    this.total_mass += config.mass;

    for ( var i=1; i<config.num_satellites; i++) {
      let m = Math.pow(Math.random(),3)*config.max_satellite_mass+0.1;
      let a = Math.random()*2*Math.PI;
      let r = config.extent[0] + Math.random()*Math.random()*(config.extent[1] - config.extent[0]);
      let body = new Body(new Vector(Math.cos(a),Math.sin(a)).scale(r).add(p), m);
      let v = Math.sqrt(this.g*config.mass);
      body.velocity = new Vector(Math.sin(a), -Math.cos(a)).scale(v);
      bodies.push(body);
      this.total_mass += m;
    }

    return bodies;

  }

  make_comets(n:number) {
    let bodies = [];
    for (var i=0; i<n; i++ ) {
      let a = Math.random() * 2 * Math.PI;
      let body = new Body(new Vector(Math.cos(a),Math.sin(a)).scale(200000+1000000*Math.random()), 50000);
      body.velocity = new Vector(Math.random()-0.5,Math.random()-0.5).scale(10000);
      bodies.push(body);
      this.total_mass += 0.5;
    }
    return bodies;
  }

  main_loop() {
    if ( this.running ) {
      let current_time = Date.now();
      this.compute_distances();
      this.find_collisions();
      this.dynamics();
      this.camera.add(Vector.diff(this.camera,this.bodies[this.follow].position).scale(-this.dt*this.K));
      this.t++;
      this.step_time = Date.now() - current_time;
      this.frac = this.bodies[0].mass / this.total_mass;
    }
  }

  onResize(event) {
    this.mainWindowWidth = event.target.innerWidth;
    this.mainWindowHeight = event.target.innerHeight;
  }

  remove(array, element) {
    var i = array.indexOf(element);
    if ( i > -1 ) {
      array.splice(i,1);
    }
    return array;
  }

  select_body(event) {
    let position = new Vector(
      (event.screenX-this.mainWindowWidth/2)/this.zoom+this.camera.x,
      (event.screenY-this.mainWindowHeight/2)/this.zoom+this.camera.y
    );
    let index = 0;
    let d = Vector.distance(position, this.bodies[0].position);
    for (var i=1; i<this.num; i++) {
      let e = Vector.distance(position, this.bodies[i].position);
      if ( !this.bodies[i].absorbed && e < d ) {
        d = e;
        index = i;
      }
    }
    this.follow = index;
    event.stopPropagation();
  }

  note(msg) {
    console.log(msg)
  }

}
