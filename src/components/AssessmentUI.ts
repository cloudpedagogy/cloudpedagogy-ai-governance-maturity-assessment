import type { Schema, AssessmentRecord } from '../types';
import { calculateGovernanceProfile, exportToJSON, exportToMarkdown } from '../logic/assessment';

export class AssessmentUI {
    private schema: Schema;
    private currentRecord: AssessmentRecord;
    private currentDimensionIndex: number = -1; // -1 for welcome screen
    private container: HTMLElement;
    private isRendering: boolean = false;

    constructor(schema: Schema, container: HTMLElement) {
        this.schema = schema;
        this.container = container;
        this.currentRecord = this.loadFromStorage() || this.createNewRecord();
    }

    private createNewRecord(): AssessmentRecord {
        return {
            assessment_id: this.generateUUID(),
            organisation_name: '',
            date_created: new Date().toISOString().split('T')[0],
            team_mode: false,
            scores: {},
            notes: {}
        };
    }

    private generateUUID(): string {
        // crypto.randomUUID() is only available in secure contexts (HTTPS/localhost)
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for non-secure contexts (e.g. HTTP S3 buckets)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    private async showModal(title: string, message: string, confirmLabel: string = 'OK', showCancel: boolean = false): Promise<boolean> {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        ${showCancel ? `<button class="secondary" id="modalCancel">Cancel</button>` : ''}
                        <button class="primary" id="modalConfirm">${confirmLabel}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const cleanup = (result: boolean) => {
                document.body.removeChild(overlay);
                resolve(result);
            };

            overlay.querySelector('#modalConfirm')?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup(true);
            });
            overlay.querySelector('#modalCancel')?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup(false);
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(false);
            });
        });
    }

    render() {
        if (this.isRendering) return;
        this.isRendering = true;

        try {
            if (this.currentDimensionIndex === -1) {
                this.renderWelcome();
            } else if (this.currentDimensionIndex < this.schema.dimensions.length) {
                this.renderDimension();
            } else {
                this.renderResults();
            }
        } finally {
            this.isRendering = false;
        }
    }

    private renderWelcome() {
        this.container.innerHTML = `
            <div class="card animate-fade">
                <div class="dimension-description">
                    <p>This assessment evaluates your organisation across 7 key governance dimensions. It is designed to expose structural weaknesses and guide institutional learning.</p>
                    <p class="muted">Note: This tool is fully local and privacy-preserving. No data leaves your browser.</p>
                </div>
                
                <div class="form-group">
                    <label for="orgName" class="semibold">Organisation Name</label>
                    <input type="text" id="orgName" value="${this.currentRecord.organisation_name || ''}" placeholder="Enter organisation name...">
                </div>
                
                <div class="card" style="margin-top: 2rem;">
                    <p class="semibold" style="margin-bottom: 1rem;">Assessment Mode</p>
                    <div style="display: flex; gap: 2rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9375rem;">
                            <input type="radio" name="mode" value="individual" ${!this.currentRecord.team_mode ? 'checked' : ''}> Individual Reflection
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9375rem;">
                            <input type="radio" name="mode" value="team" ${this.currentRecord.team_mode ? 'checked' : ''}> Team Discussion
                        </label>
                    </div>
                </div>

                ${this.currentRecord.organisation_name ? `<p class="muted" style="text-align: center;">You have a saved assessment. Beginning will resume your progress.</p>` : ''}
                
                <div class="nav-buttons" style="justify-content: center;">
                    <button type="button" class="primary" id="startBtn">${this.currentRecord.organisation_name ? 'Continue Assessment' : 'Begin Assessment'}</button>
                    <button type="button" class="secondary" id="demoBtn">Try Healthcare Demo</button>
                    ${this.currentRecord.organisation_name ? `<button type="button" class="secondary" id="clearAll" style="color: #777;">Clear Progress</button>` : ''}
                </div>
            </div>
            
            <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8125rem;">
                <p><strong>Design Note:</strong> This tool is built using <strong>Capability-Driven Development (CDD)</strong>. It prioritises the maturity of your governance capabilities over simple benchmarking or capability distribution. The assessment is designed to reveal organisational blind spots and reveal fragility in how AI systems are governed.</p>
            </div>
        `;

        this.container.querySelector('#startBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const orgName = (this.container.querySelector('#orgName') as HTMLInputElement).value;
            const mode = (this.container.querySelector('input[name="mode"]:checked') as HTMLInputElement).value;
            this.currentRecord.organisation_name = orgName || 'Default Organisation';
            this.currentRecord.team_mode = mode === 'team';
            this.saveToStorage();
            
            // Resume logic
            if (Object.keys(this.currentRecord.scores).length > 0) {
                this.currentDimensionIndex = Object.keys(this.currentRecord.scores).length;
                if (this.currentDimensionIndex >= this.schema.dimensions.length) {
                    this.currentDimensionIndex = this.schema.dimensions.length;
                }
            } else {
                this.currentDimensionIndex = 0;
            }
            this.render();
        });

        this.container.querySelector('#clearAll')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const confirmed = await this.showModal('Clear Progress', 'Are you sure you want to clear all saved assessment data? This cannot be undone.', 'Clear Data', true);
            if (confirmed) {
                this.resetAssessment();
            }
        });

        this.container.querySelector('#demoBtn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (this.currentRecord.organisation_name) {
                const confirmed = await this.showModal('Load Demo', 'Loading the demo will replace your current progress. Continue?', 'Load Demo', true);
                if (!confirmed) return;
            }
            this.loadDemo();
            this.saveToStorage();
            this.currentDimensionIndex = this.schema.dimensions.length; // Skip to results
            this.render();
        });
    }

    private loadDemo() {
        this.currentRecord = {
            assessment_id: this.generateUUID(),
            organisation_name: 'St. Jude Healthcare Trust',
            date_created: new Date().toISOString().split('T')[0],
            team_mode: true,
            scores: {
                'traceability': 3,
                'boundary_clarity': 2,
                'risk_management': 3,
                'accountability': 1,
                'policy_alignment': 1,
                'review_practices': 2,
                'learning_capability': 1
            },
            notes: {
                'traceability': 'Full audit logs for diagnostic AI are maintained and reviewed monthly.',
                'accountability': 'Accountability is currently distributed across IT and clinical leads with no central oversight body.',
                'policy_alignment': 'Internal AI policy is based on general data protection rather than specific AI ethics frameworks.'
            }
        };
    }

    private renderDimension() {
        const dim = this.schema.dimensions[this.currentDimensionIndex];
        const progress = ((this.currentDimensionIndex) / this.schema.dimensions.length) * 100;

        this.container.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <p style="text-align: right; color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 1rem;">Dimension ${this.currentDimensionIndex + 1} of ${this.schema.dimensions.length}</p>
            <div class="card animate-slide">
                <h2 class="dimension-title">${dim.name}</h2>
                <p class="dimension-description">${dim.description}</p>
                
                <div class="reflective-prompts">
                    <h4>Reflection Scaffold</h4>
                    <ul>
                        ${dim.reflective_prompts.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>

                <div class="scoring-section">
                    <h3 style="margin-bottom: 0.5rem;">1. Assessment Input: ${this.currentRecord.team_mode ? 'Your team\'s current level' : 'Your current level'}</h3>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Select the state that best represents your ${this.currentRecord.team_mode ? 'collective' : 'individual'} practice.</p>
                    
                    <div class="scoring-grid" id="scoringGrid">
                        ${this.schema.levels.map((level, idx) => {
                            const isSelected = this.currentRecord.scores[dim.id] === level.id;
                            return `
                            <label class="score-option ${isSelected ? 'selected' : ''}" for="level-${level.id}">
                                <input type="radio" id="level-${level.id}" name="maturity-level" value="${level.id}" ${isSelected ? 'checked' : ''} style="display: none;">
                                <div style="display: flex; align-items: flex-start; gap: 0rem;">
                                    <div class="radio-indicator ${isSelected ? 'active' : ''}" style="margin-top: 4px;"></div>
                                    <div>
                                        <div class="score-value">${level.id}</div>
                                        <div class="score-label">${level.name}</div>
                                        <div class="score-desc">${dim.levels[idx]}</div>
                                    </div>
                                </div>
                            </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="notes-section" style="margin-top: 2.5rem;">
                    <h3>2. Reflective notes (Optional)</h3>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">Capture ${this.currentRecord.team_mode ? 'team observations' : 'personal observations'} and evidence for your oversight teams.</p>
                    <textarea id="notes" placeholder="Enter reflective notes here...">${this.currentRecord.notes[dim.id] || ''}</textarea>
                </div>

                <div class="nav-buttons">
                    <button type="button" class="secondary" id="prevBtn">${this.currentDimensionIndex === 0 ? 'Home' : 'Previous'}</button>
                    <button type="button" class="primary" id="nextBtn">${this.currentDimensionIndex === this.schema.dimensions.length - 1 ? 'Finish' : 'Next Dimension'}</button>
                </div>
            </div>
        `;

        // Selection Handler via Radio Changes
        this.container.querySelectorAll('input[name="maturity-level"]').forEach(input => {
            input.addEventListener('change', (e) => {
                e.stopPropagation();
                const val = (e.target as HTMLInputElement).value;
                const score = parseInt(val);
                this.currentRecord.scores[dim.id] = score;
                
                // Visual update
                this.container.querySelectorAll('.score-option').forEach(opt => opt.classList.remove('selected'));
                this.container.querySelectorAll('.radio-indicator').forEach(rad => rad.classList.remove('active'));
                
                const label = this.container.querySelector(`label[for="level-${val}"]`);
                label?.classList.add('selected');
                label?.querySelector('.radio-indicator')?.classList.add('active');
                
                this.saveToStorage();
            });
        });

        this.container.querySelector('#prevBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.currentDimensionIndex--;
            this.render();
        });

        this.container.querySelector('#nextBtn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const notesArea = this.container.querySelector('#notes') as HTMLTextAreaElement;
            if (notesArea) {
                this.currentRecord.notes[dim.id] = notesArea.value;
            }
            
            const currentScore = this.currentRecord.scores[dim.id];
            if (currentScore === undefined) {
                await this.showModal('Input Required', `Please select a maturity level for "${dim.name}" before proceeding.`);
                return;
            }
            
            this.saveToStorage();
            this.currentDimensionIndex++;
            this.render();
        });
    }

    private renderResults() {
        const profile = calculateGovernanceProfile(this.schema, this.currentRecord);
        this.container.innerHTML = `
            <div class="animate-fade">
                <div class="results-header">
                    <h2>Governance Profile: ${this.currentRecord.organisation_name}</h2>
                    <p class="muted">${this.currentRecord.team_mode ? 'Team Discussion Mode' : 'Individual Reflection Mode'} &middot; ${this.currentRecord.date_created}</p>
                    <p class="semibold" style="margin-top: 1rem;">Overall State: ${profile.overallMaturity}</p>
                </div>

                <div class="profile-grid">
                    <div class="card">
                        <h3>Institutional Portfolio</h3>
                        <div class="profile-column-container">
                            <div class="profile-column">
                                <h4 class="semibold">Strong Areas</h4>
                                <ul>${profile.strong.map(s => `<li>${s}</li>`).join('') || '<li class="muted">None identified</li>'}</ul>
                            </div>
                            <div class="profile-column">
                                <h4 class="semibold">Developing Areas</h4>
                                <ul>${profile.developing.map(s => `<li>${s}</li>`).join('') || '<li class="muted">None identified</li>'}</ul>
                            </div>
                            <div class="profile-column">
                                <h4 class="semibold">Strengthening Required</h4>
                                <ul>${profile.weak.map(s => `<li>${s}</li>`).join('') || '<li class="muted">None identified</li>'}</ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="results-grid">
                    <div class="card">
                        <h3>Interpreted Patterns</h3>
                        <div class="pattern-list">
                            ${profile.patterns.map(p => `
                                <div class="pattern-item">
                                    <strong class="semibold">${p.name}</strong>
                                    <p>${p.implication}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="card">
                        <h3>Governance Fragility Signals</h3>
                        <ul class="fragility-list">
                            ${profile.fragilitySignals.map(s => `<li>${s}</li>`).join('') || '<li class="muted">No immediate fragility signals detected.</li>'}
                        </ul>
                    </div>
                </div>

                <div class="results-grid">
                    <div class="card">
                        <h3>Improvement Directions</h3>
                        <ul class="improvement-list">
                            ${profile.improvementDirections.map(d => `<li>${d}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="card">
                        <h3>Discussion & Reflection Prompts</h3>
                        <ul class="reflection-list">
                            ${profile.reflectionPrompts.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                <div class="nav-buttons" style="margin-top: 3rem;">
                    <button type="button" class="secondary" id="jsonBtn">Export JSON</button>
                    <button type="button" class="secondary" id="mdBtn">Export Markdown</button>
                    <button type="button" class="primary" id="printBtn">Print Profile</button>
                    <button type="button" class="secondary" id="homeBtn">New Assessment</button>
                </div>
            </div>
        `;

        this.container.querySelector('#jsonBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const data = exportToJSON(this.currentRecord);
            this.downloadFile(data, `governance-profile-${this.currentRecord.organisation_name.toLowerCase().replace(/\s+/g, '-')}.json`, 'application/json');
        });

        this.container.querySelector('#mdBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const data = exportToMarkdown(this.currentRecord, profile);
            this.downloadFile(data, `governance-profile-${this.currentRecord.organisation_name.toLowerCase().replace(/\s+/g, '-')}.md`, 'text/markdown');
        });

        this.container.querySelector('#printBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.print();
        });

        this.container.querySelector('#homeBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetAssessment();
        });
    }

    private resetAssessment() {
        localStorage.removeItem('ai_gov_assessment');
        this.currentDimensionIndex = -1;
        this.currentRecord = this.createNewRecord();
        this.render();
    }

    private saveToStorage() {
        localStorage.setItem('ai_gov_assessment', JSON.stringify(this.currentRecord));
    }

    private loadFromStorage(): AssessmentRecord | null {
        try {
            const data = localStorage.getItem('ai_gov_assessment');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load assessment from storage', e);
            return null;
        }
    }

    private downloadFile(content: string, fileName: string, contentType: string) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}
