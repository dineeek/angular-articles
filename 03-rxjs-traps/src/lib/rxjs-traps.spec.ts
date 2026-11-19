import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RxjsTraps } from './rxjs-traps'

describe('RxjsTraps', () => {
  let component: RxjsTraps
  let fixture: ComponentFixture<RxjsTraps>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RxjsTraps],
    }).compileComponents()

    fixture = TestBed.createComponent(RxjsTraps)
    component = fixture.componentInstance
    await fixture.whenStable()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
