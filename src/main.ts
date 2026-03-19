import './style.css'
import { AssessmentUI } from './components/AssessmentUI'
import schemaData from '../MATURITY_SCHEMA.json'
import type { Schema } from './types'

const appElement = document.querySelector<HTMLDivElement>('#app')

if (appElement) {
  const schema = schemaData as Schema;
  const assessment = new AssessmentUI(schema, appElement);
  assessment.render();
}
