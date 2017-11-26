import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CanvasService } from './canvas.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {

  constructor(private canvasService: CanvasService) { }

  mainWindowWidth = window.innerWidth;
  mainWindowHeight = window.innerHeight;

  ngOnInit() {
    window.onload = () => this.canvasService.init();
  }

  onResize(event) {
    this.mainWindowWidth = event.target.innerWidth;
    this.mainWindowHeight = event.target.innerHeight;
    this.canvasService.resize(this.mainWindowWidth, this.mainWindowHeight);
  }

  note(msg) {
    console.log(msg)
  }

  get num_bodies() {
    return this.canvasService.num_bodies;
  }

  get zoom() {
    return this.canvasService.zoom;
  }

  set zoom(z: number) {
    this.canvasService.zoom = z;
  }

  get dt() {
    return this.canvasService.dt;
  }

  set dt(dt: number) {
    this.canvasService.dt = dt;
  }

  select_body(event) {
    this.canvasService.select_body(event)
  }

  get system() {
    return this.canvasService.system;
  }

  get bodies() {
    return this.canvasService.bodies;
  }

  get follow() {
    return this.canvasService.follow;
  }

  set follow(i: number) {
    this.canvasService.follow = i;
  }

}
