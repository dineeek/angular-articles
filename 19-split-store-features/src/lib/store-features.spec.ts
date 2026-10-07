import { ComponentFixture, TestBed } from '@angular/core/testing'
import { StoreFeatures } from './store-features'

describe('StoreFeatures', () => {
  let component: StoreFeatures
  let fixture: ComponentFixture<StoreFeatures>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreFeatures],
    }).compileComponents()

    fixture = TestBed.createComponent(StoreFeatures)
    component = fixture.componentInstance
    await fixture.whenStable()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
