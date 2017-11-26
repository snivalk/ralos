import { Injectable } from '@angular/core';
import { Vector } from './vector';
import { Body } from './body';
import { config } from './config';

@Injectable()
export class CanvasService {

  constructor() { }

  mainWindowWidth = window.innerWidth;
  mainWindowHeight = window.innerHeight;

  // simulation parameters
  dt = 0.01;
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
  canvas;
  ctx;

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

  init() {

    this.canvas = <HTMLCanvasElement>document.getElementById('canvas');
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = 'white';

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

      // this.compute_histogram();

    }

    this.num_bodies = this.bodies.length;
    this.camera = Vector.copy(this.bodies[this.follow].position);
    this.initialize_matrices();
    this.main_loop();

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
              this.bodies[I].just_collided = 255;
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
      if ( !this.bodies[i].absorbed && this.bodies[i].just_collided > 0 ) {
        this.bodies[i].just_collided -= 5;
      }
      if ( !this.bodies[i].absorbed ) {
        this.bodies[i].integrate(this.dt);
      }
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

    this.draw();

    window.requestAnimationFrame(() => this.main_loop());

  }

  draw() {

    this.ctx.clearRect(0, 0, this.mainWindowWidth, this.mainWindowHeight);
    let i = 0;

    for ( let body of this.bodies ) {

      if ( ! body.absorbed ) {

        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.arc(
          this.mainWindowWidth/2 + this.zoom*(body.position.x - this.camera.x),
          this.mainWindowHeight/2 + this.zoom*(body.position.y - this.camera.y),
          this.zoom*body.radius <= 0.5 ? 0.5 : this.zoom*body.radius,
          0,
          2*Math.PI,
          0);
        this.ctx.fill();

        if ( body.just_collided > 0 ) {
          this.ctx.strokeStyle = 'rgb('+body.just_collided+',0,0)';
          this.ctx.beginPath();
          this.ctx.arc(
            this.mainWindowWidth/2 + this.zoom*(body.position.x - this.camera.x),
            this.mainWindowHeight/2 + this.zoom*(body.position.y - this.camera.y),
            this.zoom*body.radius <= 0.5 ? 5.5 : this.zoom*body.radius + 5,
            0,
            2*Math.PI,
            0);
          this.ctx.stroke();
        }

        if ( this.labels && !body.absorbed &&  ( i == this.follow || body.name ) ) {
          let str = body.name ? body.name : "" + i
          this.ctx.font = '11pt Verdana';
          this.ctx.fillStyle = "yellow";
          let mt = this.ctx.measureText(str);
          this.ctx.fillText(
            str,
            this.mainWindowWidth/2 + this.zoom*(body.position.x  - this.camera.x) -  mt.width/2,
            this.mainWindowHeight/2 + this.zoom*(body.position.y - this.camera.y - body.radius)-16
          );
        }

      }

      i++;

    }

      // <text *ngIf="labels && !body.absorbed &&  ( i == follow || body.name )"
      //       [attr.x]="zoom*(body.position.x  - camera.x)"
      //       [attr.y]="zoom*(body.position.y - camera.y - body.radius)-16"
      //       style="text-anchor: middle"
      //       class="planet">
      //       {{body.name ? body.name : "" + i}}
      //     </text>



  }

  resize(w,h) {
    this.mainWindowWidth = w;
    this.mainWindowHeight = h;
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

}
