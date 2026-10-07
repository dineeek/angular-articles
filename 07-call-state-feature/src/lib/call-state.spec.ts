import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CallState } from './call-state'

describe('CallState', () => {
  let component: CallState
  let fixture: ComponentFixture<CallState>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CallState],
    }).compileComponents()

    fixture = TestBed.createComponent(CallState)
    component = fixture.componentInstance
    await fixture.whenStable()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
