import type { Schema, AssessmentRecord, ArtefactRef } from '../types';
import { calculateGovernanceProfile, exportToJSON, exportToMarkdown } from '../logic/assessment';
import { escapeHtml, escapeAttr } from '../logic/security';
import { validateAssessmentRecord } from '../logic/validation';
import {
    loadAssessmentFromStorage,
    saveAssessmentToStorage,
    clearAssessmentFromStorage,
    loadHistoryFromStorage,
    saveHistoryToStorage
} from '../logic/storage';

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
            notes: {},
            artefacts: [],
            capabilityNotes: '',
            governanceNotes: ''
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

    private async showModal(
        title: string,
        message: string,
        confirmLabel: string = 'OK',
        showCancel: boolean = false
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const prevFocused = document.activeElement as HTMLElement | null;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'modalTitle');

            const content = document.createElement('div');
            content.className = 'modal-content';

            const h3 = document.createElement('h3');
            h3.id = 'modalTitle';
            h3.textContent = title;

            const p = document.createElement('p');
            p.style.whiteSpace = 'pre-wrap';
            p.textContent = message;

            const actions = document.createElement('div');
            actions.className = 'modal-actions';

            let cancelBtn: HTMLButtonElement | null = null;
            if (showCancel) {
                cancelBtn = document.createElement('button');
                cancelBtn.type = 'button';
                cancelBtn.className = 'secondary';
                cancelBtn.id = 'modalCancel';
                cancelBtn.textContent = 'Cancel';
                actions.appendChild(cancelBtn);
            }

            const confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'primary';
            confirmBtn.id = 'modalConfirm';
            confirmBtn.textContent = confirmLabel;
            actions.appendChild(confirmBtn);

            content.appendChild(h3);
            content.appendChild(p);
            content.appendChild(actions);
            overlay.appendChild(content);
            document.body.appendChild(overlay);

            confirmBtn.focus();

            const cleanup = (result: boolean) => {
                document.removeEventListener('keydown', keyHandler);
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                if (prevFocused && typeof prevFocused.focus === 'function') {
                    prevFocused.focus();
                }
                resolve(result);
            };

            const keyHandler = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cleanup(false);
                }
            };
            document.addEventListener('keydown', keyHandler);

            confirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup(true);
            });
            cancelBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup(false);
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(false);
            });
        });
    }

    private async showEditArtefactModal(art: ArtefactRef): Promise<ArtefactRef | null> {
        return new Promise((resolve) => {
            const prevFocused = document.activeElement as HTMLElement | null;
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'editArtTitle');

            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.maxWidth = '460px';

            content.innerHTML = `
                <h3 id="editArtTitle" style="margin-bottom: 1rem;">Edit Evidence Reference</h3>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <div>
                        <label for="editArtType" style="display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">Type</label>
                        <select id="editArtType" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-color); font-size: 0.875rem;">
                            <option value="workflow" ${art.type === 'workflow' ? 'selected' : ''}>Workflow</option>
                            <option value="decision" ${art.type === 'decision' ? 'selected' : ''}>Decision</option>
                            <option value="document" ${art.type === 'document' ? 'selected' : ''}>Document</option>
                        </select>
                    </div>
                    <div>
                        <label for="editArtRef" style="display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">Reference ID</label>
                        <input type="text" id="editArtRef" value="${escapeAttr(art.ref)}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius); font-size: 0.875rem;" required>
                    </div>
                    <div>
                        <label for="editArtName" style="display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">Title / Description</label>
                        <input type="text" id="editArtName" value="${escapeAttr(art.name || '')}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius); font-size: 0.875rem;">
                    </div>
                </div>
                <div class="modal-actions" style="margin-top: 1.5rem;">
                    <button type="button" class="secondary" id="cancelEditArt">Cancel</button>
                    <button type="button" class="primary" id="saveEditArt">Save Changes</button>
                </div>
            `;

            overlay.appendChild(content);
            document.body.appendChild(overlay);

            const refInput = content.querySelector('#editArtRef') as HTMLInputElement;
            refInput?.focus();

            const cleanup = (result: ArtefactRef | null) => {
                document.removeEventListener('keydown', keyHandler);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (prevFocused && typeof prevFocused.focus === 'function') prevFocused.focus();
                resolve(result);
            };

            const keyHandler = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cleanup(null);
                }
            };
            document.addEventListener('keydown', keyHandler);

            content.querySelector('#cancelEditArt')?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup(null);
            });

            content.querySelector('#saveEditArt')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const newRef = (content.querySelector('#editArtRef') as HTMLInputElement).value.trim();
                const newName = (content.querySelector('#editArtName') as HTMLInputElement).value.trim();
                const newType = (content.querySelector('#editArtType') as HTMLSelectElement).value as 'workflow' | 'decision' | 'document';

                if (!newRef) {
                    refInput.focus();
                    return;
                }

                cleanup({
                    ...art,
                    type: newType,
                    ref: newRef,
                    name: newName || newRef
                });
            });
        });
    }

    private async showHistoryModal(): Promise<void> {
        const history = this.getHistory();
        if (history.length === 0) {
            await this.showModal('Assessment History', 'No past assessment snapshots recorded in local storage.');
            return;
        }

        return new Promise((resolve) => {
            const prevFocused = document.activeElement as HTMLElement | null;
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'historyModalTitle');

            const content = document.createElement('div');
            content.className = 'modal-content history-modal-content';
            content.style.maxWidth = '680px';
            content.style.maxHeight = '80vh';
            content.style.overflowY = 'auto';

            const historyListHtml = history.map((rec, idx) => {
                const profile = calculateGovernanceProfile(this.schema, rec);
                const scoredCount = Object.keys(rec.scores).length;
                return `
                <div class="history-item card" style="padding: 1rem; margin-bottom: 0.75rem; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <strong style="font-size: 1rem; color: var(--text-primary);">${escapeHtml(rec.organisation_name || 'Unnamed Organisation')}</strong>
                        <div class="muted" style="font-size: 0.8125rem; margin-top: 2px;">
                            <span>${escapeHtml(rec.date_created)}</span> &middot; 
                            <span>${rec.team_mode ? 'Team Mode' : 'Individual Mode'}</span> &middot;
                            <span>${scoredCount}/7 Dimensions Scored</span>
                        </div>
                        <div style="margin-top: 4px;">
                            <span class="badge strategic" style="font-size: 0.75rem;">Readiness: ${profile.readinessIndex}%</span>
                            <span class="muted" style="font-size: 0.75rem; margin-left: 6px;">${escapeHtml(profile.overallMaturity)}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="primary restore-hist-btn" data-index="${idx}" style="padding: 4px 10px; font-size: 0.8125rem;">Restore</button>
                        <button type="button" class="secondary compare-hist-btn" data-index="${idx}" style="padding: 4px 10px; font-size: 0.8125rem;">Compare</button>
                        <button type="button" class="secondary delete-hist-btn" data-index="${idx}" style="padding: 4px 10px; font-size: 0.8125rem; color: #dc2626;" aria-label="Delete snapshot">&times;</button>
                    </div>
                </div>
                `;
            }).join('');

            content.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 id="historyModalTitle" style="margin: 0;">Assessment History Snapshots</h3>
                    <span class="muted" style="font-size: 0.8125rem;">Saved in LocalStorage (Max 5)</span>
                </div>
                <p class="muted" style="font-size: 0.875rem; margin-bottom: 1rem;">
                    Restore a previous snapshot as your active assessment, or compare against your active results.
                </p>
                <div class="history-list">
                    ${historyListHtml}
                </div>
                <div class="modal-actions" style="margin-top: 1.5rem; justify-content: flex-end;">
                    <button type="button" class="secondary" id="closeHistoryModal">Close</button>
                </div>
            `;

            overlay.appendChild(content);
            document.body.appendChild(overlay);

            const closeBtn = content.querySelector('#closeHistoryModal') as HTMLButtonElement;
            closeBtn?.focus();

            const cleanup = () => {
                document.removeEventListener('keydown', keyHandler);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (prevFocused && typeof prevFocused.focus === 'function') prevFocused.focus();
                resolve();
            };

            const keyHandler = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cleanup();
                }
            };
            document.addEventListener('keydown', keyHandler);

            closeBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanup();
            });

            // Restore button handler
            content.querySelectorAll('.restore-hist-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10);
                    const selectedRec = history[idx];
                    if (!selectedRec) return;

                    cleanup();

                    const confirmed = await this.showModal(
                        'Restore Snapshot',
                        `Restoring "${selectedRec.organisation_name || 'Assessment'}" will replace your current active assessment data. Continue?`,
                        'Restore Snapshot',
                        true
                    );
                    if (confirmed) {
                        this.currentRecord = selectedRec;
                        this.saveToStorage();
                        const firstUnanswered = this.schema.dimensions.findIndex(d => this.currentRecord.scores[d.id] === undefined);
                        if (firstUnanswered !== -1) {
                            this.currentDimensionIndex = firstUnanswered;
                        } else {
                            this.currentDimensionIndex = this.schema.dimensions.length;
                        }
                        this.render();
                    }
                });
            });

            // Compare button handler
            content.querySelectorAll('.compare-hist-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10);
                    const selectedRec = history[idx];
                    cleanup();
                    if (selectedRec) {
                        this.renderResults(selectedRec);
                    }
                });
            });

            // Delete button handler
            content.querySelectorAll('.delete-hist-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10);
                    const updatedHistory = history.filter((_, i) => i !== idx);
                    saveHistoryToStorage(updatedHistory, window.localStorage);
                    cleanup();
                    this.showHistoryModal();
                });
            });
        });
    }

    private handleImportFile(file: File) {
        const reader = new FileReader();
        reader.onload = async (re) => {
            const rawContent = re.target?.result as string;
            let parsed: unknown;
            try {
                parsed = JSON.parse(rawContent);
            } catch {
                await this.showModal('Invalid JSON File', 'The uploaded file could not be parsed as valid JSON.');
                return;
            }

            const validation = validateAssessmentRecord(parsed, this.schema.dimensions.map(d => d.id));
            if (!validation.isValid || !validation.record) {
                const message = 'The assessment file contains invalid data:\n\n• ' + validation.errors.join('\n• ');
                await this.showModal('Import Validation Failed', message);
                return;
            }

            // Confirm before replacing active assessment if active assessment has progress
            const hasActiveWork = Boolean(
                this.currentRecord.organisation_name || 
                Object.keys(this.currentRecord.scores).length > 0
            );

            if (hasActiveWork) {
                const confirmed = await this.showModal(
                    'Replace Current Assessment',
                    'Importing this assessment will replace your active assessment data. Are you sure you want to proceed?',
                    'Import & Replace',
                    true
                );
                if (!confirmed) return;
                // Preserve previous active work in history buffer so it is not lost
                this.saveToHistory();
            }

            this.currentRecord = validation.record;
            this.saveToStorage();

            const scoredCount = Object.keys(this.currentRecord.scores).length;
            if (scoredCount >= this.schema.dimensions.length) {
                this.currentDimensionIndex = this.schema.dimensions.length; // Navigate to Results
            } else {
                const firstIncomplete = this.schema.dimensions.findIndex(d => this.currentRecord.scores[d.id] === undefined);
                this.currentDimensionIndex = firstIncomplete !== -1 ? firstIncomplete : 0;
            }
            this.render();
        };
        reader.readAsText(file);
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
        const safeOrgName = this.currentRecord.organisation_name || '';
        const hasSaved = Boolean(safeOrgName || Object.keys(this.currentRecord.scores).length > 0);

        this.container.innerHTML = `
            <div class="card animate-fade">
                <div class="dimension-description">
                    <p>This assessment evaluates your organisation across 7 key governance dimensions. It is designed to expose structural weaknesses and guide institutional learning.</p>
                    <p class="muted">Note: This tool is fully local and privacy-preserving. No data leaves your browser.</p>
                </div>
                
                <div class="form-group">
                    <label for="orgName" class="semibold">Organisation Name</label>
                    <input type="text" id="orgName" placeholder="Enter organisation name...">
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

                ${hasSaved ? `<p class="muted" style="text-align: center;">You have a saved assessment. Beginning will resume your progress.</p>` : ''}
                
                <div class="nav-buttons" style="justify-content: center; flex-wrap: wrap; gap: 0.75rem;">
                    <button type="button" class="primary" id="startBtn">${hasSaved ? 'Continue Assessment' : 'Begin Assessment'}</button>
                    <button type="button" class="secondary" id="demoBtn">Try Healthcare Demo</button>
                    <button type="button" class="secondary" id="importBtn">Import Assessment JSON</button>
                    <button type="button" class="secondary" id="historyBtn">History Snapshots (${this.getHistory().length})</button>
                    ${hasSaved ? `<button type="button" class="secondary" id="clearAll" style="color: var(--color-text-secondary);">Clear Progress</button>` : ''}
                </div>
                <input type="file" id="importUpload" style="display: none;" accept=".json">
            </div>
            
            <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8125rem;">
                <p><strong>Design Note:</strong> This tool is built using <strong>Capability-Driven Development (CDD)</strong>. It prioritises the maturity of your governance capabilities over simple benchmarking or capability distribution. The assessment is designed to reveal organisational blind spots and reveal fragility in how AI systems are governed.</p>
            </div>
        `;

        // Safe DOM property assignment for text input
        const orgNameInput = this.container.querySelector('#orgName') as HTMLInputElement;
        if (orgNameInput) {
            orgNameInput.value = safeOrgName;
            orgNameInput.addEventListener('input', () => {
                this.currentRecord.organisation_name = orgNameInput.value.trim();
                this.saveToStorage();
            });
        }

        // Mode change listener
        this.container.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const modeVal = (e.target as HTMLInputElement).value;
                this.currentRecord.team_mode = modeVal === 'team';
                this.saveToStorage();
            });
        });

        this.container.querySelector('#startBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentOrgInput = this.container.querySelector('#orgName') as HTMLInputElement;
            const orgName = currentOrgInput ? currentOrgInput.value.trim() : '';
            const checkedMode = this.container.querySelector('input[name="mode"]:checked') as HTMLInputElement;
            const mode = checkedMode ? checkedMode.value : 'individual';
            this.currentRecord.organisation_name = orgName || 'Default Organisation';
            this.currentRecord.team_mode = mode === 'team';
            this.saveToStorage();
            
            // Resume logic: find first unanswered dimension index
            const firstUnansweredIndex = this.schema.dimensions.findIndex(
                dim => this.currentRecord.scores[dim.id] === undefined
            );

            if (firstUnansweredIndex !== -1) {
                this.currentDimensionIndex = firstUnansweredIndex;
            } else if (Object.keys(this.currentRecord.scores).length >= this.schema.dimensions.length) {
                this.currentDimensionIndex = this.schema.dimensions.length; // Results
            } else {
                this.currentDimensionIndex = 0;
            }
            this.render();
        });

        const importInput = this.container.querySelector('#importUpload') as HTMLInputElement;
        this.container.querySelector('#importBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            importInput?.click();
        });

        importInput?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                importInput.value = '';
                this.handleImportFile(file);
            }
        });

        this.container.querySelector('#historyBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showHistoryModal();
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
            if (this.currentRecord.organisation_name || Object.keys(this.currentRecord.scores).length > 0) {
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
            },
            artefacts: [
                { type: 'workflow', ref: 'WF-HEALTH-001', name: 'Diagnostic Triage Cluster' }
            ],
            capabilityNotes: 'This assessment supports institutional-level capability building for clinical governance leads.',
            governanceNotes: 'Assumptions: The healthcare trust is moving towards centralized AI oversight. Risks: Distributed accountability remains a strategic concern.'
        };
    }

    private renderDimension() {
        const dim = this.schema.dimensions[this.currentDimensionIndex];
        const progress = ((this.currentDimensionIndex) / this.schema.dimensions.length) * 100;
        const currentScore = this.currentRecord.scores[dim.id];
        const currentNotes = this.currentRecord.notes[dim.id] || '';

        this.container.innerHTML = `
            <!-- Dimension Stepper Navigation (B3.2) -->
            <nav class="stepper-nav" aria-label="Governance dimensions stepper" style="margin-bottom: 1.5rem;">
                <div class="stepper-container" role="tablist">
                    ${this.schema.dimensions.map((d, idx) => {
                        const isCurrent = idx === this.currentDimensionIndex;
                        const isAnswered = this.currentRecord.scores[d.id] !== undefined;
                        const statusText = isAnswered ? `Answered: Level ${this.currentRecord.scores[d.id]}` : 'Unanswered';
                        return `
                            <button type="button" 
                                role="tab"
                                class="stepper-step ${isCurrent ? 'active' : ''} ${isAnswered ? 'answered' : 'unanswered'}" 
                                data-index="${idx}"
                                aria-selected="${isCurrent}"
                                aria-label="${escapeAttr(`Dimension ${idx + 1}: ${d.name} (${statusText})`)}"
                                title="${escapeAttr(`${d.name} (${statusText})`)}"
                            >
                                <span class="step-badge" aria-hidden="true">${isAnswered ? '✓' : idx + 1}</span>
                                <span class="step-title">${escapeHtml(d.name)}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </nav>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <p style="text-align: right; color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 1rem;">Dimension ${this.currentDimensionIndex + 1} of ${this.schema.dimensions.length}</p>
            <div class="card animate-slide">
                <h2 class="dimension-title">${escapeHtml(dim.name)}</h2>
                <p class="dimension-description">${escapeHtml(dim.description)}</p>
                
                <div class="reflective-prompts">
                    <h4>Reflection Scaffold</h4>
                    <ul>
                        ${dim.reflective_prompts.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                    </ul>
                </div>

                <div class="scoring-section">
                    <h3 style="margin-bottom: 0.5rem;">1. Assessment Input: ${this.currentRecord.team_mode ? "Your team's current level" : 'Your current level'}</h3>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Select the state that best represents your ${this.currentRecord.team_mode ? 'collective' : 'individual'} practice.</p>
                    
                    <fieldset class="scoring-fieldset">
                        <legend class="sr-only">${escapeHtml(dim.name)} maturity level options</legend>
                        <div class="scoring-grid" id="scoringGrid" role="radiogroup" aria-label="${escapeAttr(dim.name)} maturity level options">
                            ${this.schema.levels.map((level, idx) => {
                                const isSelected = currentScore === level.id;
                                return `
                                <label class="score-option ${isSelected ? 'selected' : ''}" for="level-${level.id}">
                                    <input 
                                        type="radio" 
                                        id="level-${level.id}" 
                                        name="maturity-level" 
                                        value="${level.id}" 
                                        class="visually-hidden-radio"
                                        ${isSelected ? 'checked' : ''}
                                        aria-checked="${isSelected}"
                                    >
                                    <div style="display: flex; align-items: flex-start; gap: 0rem;">
                                        <div class="radio-indicator ${isSelected ? 'active' : ''}" style="margin-top: 4px;" aria-hidden="true"></div>
                                        <div>
                                            <div class="score-value">${level.id}</div>
                                            <div class="score-label">${escapeHtml(level.name)}</div>
                                            <div class="score-desc">${escapeHtml(dim.levels[idx])}</div>
                                        </div>
                                    </div>
                                </label>
                                `;
                            }).join('')}
                        </div>
                    </fieldset>
                </div>

                <div class="notes-section" style="margin-top: 2.5rem;">
                    <h3>2. Reflective notes (Optional)</h3>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">Capture ${this.currentRecord.team_mode ? 'team observations' : 'personal observations'} and evidence for your oversight teams.</p>
                    <textarea id="notes" placeholder="Enter reflective notes here..."></textarea>
                </div>

                <div class="artefacts-section" style="margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                        <h3>3. Evidence & Artefacts (Optional)</h3>
                        <span class="muted" style="font-size: 0.8125rem;">Dimension: ${escapeHtml(dim.name)}</span>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">
                        Attach relevant workflow links, policy references, or decision records supporting this dimension score.
                    </p>
                    <div id="artefactList" class="artefact-pill-container" style="margin-bottom: 1.25rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${(() => {
                            const dimArtefacts = this.currentRecord.artefacts.filter(a => a.dimensionId === dim.id || (!a.dimensionId && this.currentDimensionIndex === 0));
                            if (dimArtefacts.length === 0) {
                                return '<span class="muted" style="font-size: 0.8125rem;">No evidence linked to this dimension yet.</span>';
                            }
                            return dimArtefacts.map(a => `
                                <div class="pill pill-item" style="display: inline-flex; align-items: center; gap: 0.5rem; background: #f3f4f6; border: 1px solid var(--border-color); border-radius: 20px; padding: 4px 10px; font-size: 0.8125rem;">
                                    <span class="badge ${escapeAttr(a.type)}" style="font-size: 0.6875rem; padding: 2px 6px;">${escapeHtml(a.type)}</span>
                                    <strong style="color: var(--text-primary);">${escapeHtml(a.ref)}</strong>
                                    ${a.name && a.name !== a.ref ? `<span class="muted" style="font-size: 0.75rem;">— ${escapeHtml(a.name)}</span>` : ''}
                                    <button type="button" class="pill-edit" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Edit evidence ${escapeAttr(a.ref)}" title="Edit reference" style="background: none; border: none; cursor: pointer; color: #555; font-size: 0.8125rem; line-height: 1; padding: 0 4px; margin-left: 2px;">✎</button>
                                    <button type="button" class="pill-delete" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Remove evidence ${escapeAttr(a.ref)}" title="Remove reference" style="background: none; border: none; cursor: pointer; color: #888; font-size: 1.1rem; line-height: 1; padding: 0 4px; margin-left: 2px;">&times;</button>
                                </div>
                            `).join('');
                        })()}
                    </div>
                    <div class="artefact-input-row" style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                        <select id="artefactType" aria-label="Evidence Type" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-color); font-size: 0.875rem;">
                            <option value="workflow">Workflow</option>
                            <option value="decision">Decision</option>
                            <option value="document">Document</option>
                        </select>
                        <input type="text" id="artefactRef" placeholder="Reference ID (e.g. WF-101, POL-202)" style="flex: 1; min-width: 140px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius); font-size: 0.875rem;" aria-label="Evidence Reference">
                        <input type="text" id="artefactName" placeholder="Description / Title (optional)" style="flex: 1.5; min-width: 180px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius); font-size: 0.875rem;" aria-label="Evidence Description">
                        <button type="button" class="secondary" id="addArtefact" style="padding: 0.5rem 1rem;">Add Evidence</button>
                    </div>
                </div>

                <div class="nav-buttons">
                    <button type="button" class="secondary" id="prevBtn">${this.currentDimensionIndex === 0 ? 'Home' : 'Previous'}</button>
                    <button type="button" class="primary" id="nextBtn">${this.currentDimensionIndex === this.schema.dimensions.length - 1 ? 'Finish' : 'Next Dimension'}</button>
                </div>
            </div>
        `;

        // Safe DOM property assignment for notes textarea & live auto-save
        const notesArea = this.container.querySelector('#notes') as HTMLTextAreaElement;
        if (notesArea) {
            notesArea.value = currentNotes;
            notesArea.addEventListener('input', () => {
                this.currentRecord.notes[dim.id] = notesArea.value;
                this.saveToStorage();
            });
        }

        // Stepper jump handler (B3.2): auto-saves current notes & score before switching dimension
        this.container.querySelectorAll('.stepper-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetIdx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10);
                if (targetIdx === this.currentDimensionIndex) return;

                const currentNotesArea = this.container.querySelector('#notes') as HTMLTextAreaElement;
                if (currentNotesArea) {
                    this.currentRecord.notes[dim.id] = currentNotesArea.value;
                }
                this.saveToStorage();
                this.currentDimensionIndex = targetIdx;
                this.render();
            });
        });

        // Selection Handler via Radio Changes (supports mouse click, keyboard arrow navigation, and tab selection)
        this.container.querySelectorAll('input[name="maturity-level"]').forEach(input => {
            input.addEventListener('change', (e) => {
                e.stopPropagation();
                const val = (e.target as HTMLInputElement).value;
                const score = parseInt(val, 10);
                this.currentRecord.scores[dim.id] = score;
                
                // Visual update and accessible aria attributes
                this.container.querySelectorAll('.score-option').forEach(opt => opt.classList.remove('selected'));
                this.container.querySelectorAll('.radio-indicator').forEach(rad => rad.classList.remove('active'));
                this.container.querySelectorAll('input[name="maturity-level"]').forEach(inp => inp.setAttribute('aria-checked', 'false'));
                
                const currentInput = e.target as HTMLInputElement;
                currentInput.setAttribute('aria-checked', 'true');
                const label = this.container.querySelector(`label[for="level-${val}"]`);
                label?.classList.add('selected');
                label?.querySelector('.radio-indicator')?.classList.add('active');
                
                this.saveToStorage();
            });
        });

        // Previous button: save notes first!
        this.container.querySelector('#prevBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const currentNotesArea = this.container.querySelector('#notes') as HTMLTextAreaElement;
            if (currentNotesArea) {
                this.currentRecord.notes[dim.id] = currentNotesArea.value;
            }
            this.saveToStorage();
            this.currentDimensionIndex--;
            this.render();
        });

        // Next button: save notes and require score before advancing
        this.container.querySelector('#nextBtn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const currentNotesArea = this.container.querySelector('#notes') as HTMLTextAreaElement;
            if (currentNotesArea) {
                this.currentRecord.notes[dim.id] = currentNotesArea.value;
            }
            
            const currentScoreVal = this.currentRecord.scores[dim.id];
            if (currentScoreVal === undefined) {
                await this.showModal('Input Required', `Please select a maturity level for "${dim.name}" before proceeding.`);
                return;
            }
            
            this.saveToStorage();
            this.currentDimensionIndex++;
            this.render();
        });

        // Add artefact reference
        this.container.querySelector('#addArtefact')?.addEventListener('click', (_e) => {
            const typeSelect = this.container.querySelector('#artefactType') as HTMLSelectElement;
            const refInput = this.container.querySelector('#artefactRef') as HTMLInputElement;
            const nameInput = this.container.querySelector('#artefactName') as HTMLInputElement;

            const refVal = refInput ? refInput.value.trim() : '';
            const nameVal = nameInput ? nameInput.value.trim() : '';
            const typeVal = typeSelect ? typeSelect.value : 'workflow';
            const safeType = (['workflow', 'decision', 'document'].includes(typeVal) ? typeVal : 'workflow') as 'workflow' | 'decision' | 'document';

            if (refVal) {
                const newArt: ArtefactRef = {
                    id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    type: safeType,
                    ref: refVal,
                    name: nameVal || refVal,
                    dimensionId: dim.id
                };
                this.currentRecord.artefacts.push(newArt);
                this.saveToStorage();
                this.render();
            }
        });

        // Edit artefact reference button handler (B3.3)
        this.container.querySelectorAll('.pill-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const artId = (e.currentTarget as HTMLElement).getAttribute('data-id');
                const art = this.currentRecord.artefacts.find(a => (a.id || a.ref) === artId);
                if (art) {
                    const updated = await this.showEditArtefactModal(art);
                    if (updated) {
                        const idx = this.currentRecord.artefacts.findIndex(a => (a.id || a.ref) === artId);
                        if (idx !== -1) {
                            this.currentRecord.artefacts[idx] = updated;
                            this.saveToStorage();
                            this.render();
                        }
                    }
                }
            });
        });

        // Delete artefact reference button handler
        this.container.querySelectorAll('.pill-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const artId = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (artId) {
                    this.currentRecord.artefacts = this.currentRecord.artefacts.filter(a => (a.id || a.ref) !== artId);
                    this.saveToStorage();
                    this.render();
                }
            });
        });
    }

    private renderResults(previousRecord?: AssessmentRecord) {
        const history = this.getHistory();
        // Only auto-compare if previousRecord is explicitly passed OR latest history entry matches the same organisation
        let autoHistory: AssessmentRecord | undefined;
        if (history.length > 0 && this.currentRecord.organisation_name && history[0].organisation_name === this.currentRecord.organisation_name) {
            autoHistory = history[0];
        }
        const latestHistory = previousRecord || autoHistory;
        const profile = calculateGovernanceProfile(this.schema, this.currentRecord, latestHistory);
        const scoredCount = Object.keys(this.currentRecord.scores).length;
        const totalDims = this.schema.dimensions.length;
        const isPartial = scoredCount < totalDims;
        
        this.container.innerHTML = `
            <div class="animate-fade">
                <div class="results-header" style="text-align: center; margin-bottom: 2.5rem;">
                    <h2>Governance Profile: ${escapeHtml(this.currentRecord.organisation_name)}</h2>
                    <p class="muted">${this.currentRecord.team_mode ? 'Team Discussion Mode' : 'Individual Reflection Mode'} &middot; ${escapeHtml(this.currentRecord.date_created)}</p>
                    
                    <div class="readiness-index-container" style="margin-top: 2rem; display: flex; flex-direction: column; align-items: center;">
                        <span class="subtitle">Governance Readiness Index</span>
                        <div class="readiness-gauge">
                            <div class="readiness-fill" style="width: ${profile.readinessIndex}%"></div>
                        </div>
                        <div style="font-size: 3rem; font-weight: 800; color: var(--color-primary-default); margin-top: 0.5rem;">${profile.readinessIndex}%</div>
                        <p class="semibold" style="margin-top: 0.5rem; color: var(--color-text-secondary);">${escapeHtml(profile.overallMaturity)}</p>
                    </div>
                </div>

                <!-- Domain Governance Scope & Self-Assessment Notice -->
                <div class="disclaimer-banner card" style="background: #f8fafc; border-left: 4px solid var(--color-primary-default, #111); padding: 1rem 1.25rem; margin-bottom: 2rem;">
                    <strong style="color: var(--color-text-primary);">Self-Assessment Notice & Governance Scope:</strong>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5;">
                        This assessment reflects internal self-reported practices and structural alignment across 7 governance dimensions. It is an analytical diagnostic instrument for organizational learning and capability development, not external regulatory certification or statutory compliance verification.
                    </p>
                </div>

                <!-- Partial Assessment Banner (B3.6) -->
                ${isPartial ? `
                <div class="card partial-status-banner" style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem 1.25rem; margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                        <div>
                            <strong style="color: #92400e; font-size: 0.9375rem;">Partial Assessment Status:</strong>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #78350f; line-height: 1.4;">
                                <strong>${scoredCount} of ${totalDims} dimensions</strong> have been scored. In accordance with governance integrity, unanswered dimensions are factored into the readiness index at Level 0 (Unmanaged) rather than omitted, preventing false confidence.
                            </p>
                        </div>
                        <button type="button" class="secondary revisit-first-unanswered-btn" style="font-size: 0.8125rem; padding: 6px 12px; background: #ffffff; border-color: #d97706; color: #92400e;">
                            Complete Remaining Dimensions &rarr;
                        </button>
                    </div>
                </div>
                ` : ''}

                ${profile.comparison ? `
                <div class="card" style="margin-bottom: 2rem; border: 1px solid var(--color-primary-light); background: #f0f9ff;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">Trend Comparison</h3>
                        <span class="muted">Compared to ${escapeHtml(profile.comparison.previousDate)}</span>
                    </div>
                    <div style="display: flex; gap: 2rem; margin-top: 1rem;">
                        <div style="flex: 1;">
                            <span class="subtitle">Overall Shift</span>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${profile.comparison.overallChange >= 0 ? '#059669' : '#dc2626'}">
                                ${profile.comparison.overallChange >= 0 ? '↑' : '↓'} ${Math.abs(profile.comparison.overallChange)}%
                            </div>
                        </div>
                        <div style="flex: 2;">
                            <span class="subtitle">Dimension Deltas</span>
                            <div style="display: flex; gap: 4px; height: 10px; margin-top: 0.5rem;">
                                ${Object.entries(profile.comparison.deltas).map(([id, delta]) => `
                                    <div title="${escapeAttr(id)}: ${delta}" style="flex-grow: 1; background: ${delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#e5e7eb'}; border-radius: 1px;"></div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Detailed Dimension Audit & Evidence Review (B3.3) -->
                <div class="profile-grid">
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <h3 style="margin: 0;">Detailed Dimension Audit & Evidence Review</h3>
                            <span class="muted" style="font-size: 0.8125rem;">Full Basis of Maturity Assessment</span>
                        </div>
                        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                            Inspect scores, qualitative rationale notes, and linked evidence records for each of the 7 governance dimensions. Use "Revisit" to update any dimension.
                        </p>
                        
                        <div class="dimension-breakdown-table-wrapper" style="overflow-x: auto;">
                            <table class="dimension-breakdown-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid var(--border-color); background: #f9fafb;">
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary);">Dimension</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary); width: 140px;">Score & Level</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary);">Qualitative Notes</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary); width: 220px;">Linked Evidence</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-secondary); text-align: right; width: 100px;" class="hide-in-print">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.schema.dimensions.map((dim, idx) => {
                                        const score = this.currentRecord.scores[dim.id];
                                        const isAnswered = score !== undefined;
                                        const levelObj = isAnswered ? this.schema.levels.find(l => l.id === score) : null;
                                        const levelName = levelObj ? levelObj.name : 'Unanswered';
                                        const noteText = this.currentRecord.notes[dim.id] || '';
                                        const dimArtefacts = (this.currentRecord.artefacts || []).filter(a => a.dimensionId === dim.id || (!a.dimensionId && idx === 0));

                                        return `
                                        <tr style="border-bottom: 1px solid var(--border-color); vertical-align: top;">
                                            <td style="padding: 1rem;">
                                                <strong style="color: var(--text-primary); display: block;">${escapeHtml(dim.name)}</strong>
                                                <span class="muted" style="font-size: 0.75rem;">Dimension ${idx + 1}</span>
                                            </td>
                                            <td style="padding: 1rem;">
                                                ${isAnswered ? `
                                                    <span class="badge ${score >= 2 ? 'strategic' : score === 1 ? 'decision' : 'urgent'}" style="font-size: 0.75rem; padding: 3px 8px;">
                                                        Level ${score}: ${escapeHtml(levelName)}
                                                    </span>
                                                ` : `
                                                    <span class="badge" style="background: #f3f4f6; color: #9ca3af; border-color: #d1d5db; font-size: 0.75rem; padding: 3px 8px;">
                                                        Unanswered
                                                    </span>
                                                `}
                                            </td>
                                            <td style="padding: 1rem;">
                                                ${noteText ? `<p style="margin: 0; font-size: 0.8125rem; color: var(--text-primary); line-height: 1.4;">${escapeHtml(noteText)}</p>` : `<span class="muted" style="font-size: 0.8125rem; font-style: italic;">No reflective notes recorded</span>`}
                                            </td>
                                            <td style="padding: 1rem;">
                                                ${dimArtefacts.length > 0 ? `
                                                    <div style="display: flex; flex-direction: column; gap: 0.375rem;">
                                                        ${dimArtefacts.map(a => `
                                                            <div class="pill-item" style="display: inline-flex; align-items: center; gap: 0.375rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: 12px; padding: 2px 8px; font-size: 0.75rem;">
                                                                <span class="badge ${escapeAttr(a.type)}" style="font-size: 0.625rem; padding: 1px 4px;">${escapeHtml(a.type)}</span>
                                                                <strong style="color: var(--text-primary);">${escapeHtml(a.ref)}</strong>
                                                                <button type="button" class="pill-edit hide-in-print" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Edit evidence ${escapeAttr(a.ref)}" title="Edit reference" style="background: none; border: none; cursor: pointer; color: #555; font-size: 0.75rem; line-height: 1; padding: 0 2px; margin-left: 2px;">✎</button>
                                                                <button type="button" class="pill-delete hide-in-print" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Remove evidence ${escapeAttr(a.ref)}" style="background: none; border: none; cursor: pointer; color: #888; font-size: 0.875rem; line-height: 1; padding: 0 2px;">&times;</button>
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                ` : `<span class="muted" style="font-size: 0.8125rem; font-style: italic;">No evidence linked</span>`}
                                            </td>
                                            <td style="padding: 1rem; text-align: right;" class="hide-in-print">
                                                <button type="button" class="secondary revisit-dim-btn" data-index="${idx}" style="padding: 4px 10px; font-size: 0.75rem; white-space: nowrap;">
                                                    Revisit
                                                </button>
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Strategic Recommended Actions (Gap-to-Action) -->
                <div class="profile-grid" style="margin-top: 2rem;">
                    <div class="card">
                        <h3>Strategic Recommended Actions (Gap-to-Action)</h3>
                        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                            Immediate tactical remediation tasks corresponding to identified Level 0 and Level 1 governance gaps.
                        </p>
                        <div class="gap-action-table" style="margin-top: 1rem;">
                            ${profile.gapActions.length > 0 ? profile.gapActions.map(a => `
                                <div style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--border-color); align-items: flex-start;">
                                    <span class="badge ${escapeAttr(a.priority.toLowerCase())}">${escapeHtml(a.priority)}</span>
                                    <div>
                                        <div class="semibold" style="font-size: 0.875rem; color: var(--color-text-secondary); text-transform: capitalize;">${escapeHtml(a.dimension.replace(/_/g, ' '))}</div>
                                        <div style="font-size: 0.9375rem; margin-top: 0.25rem;">${escapeHtml(a.action)}</div>
                                    </div>
                                </div>
                            `).join('') : '<p class="muted" style="padding: 1rem;">No immediate gap-based actions identified. Governance practice is established.</p>'}
                        </div>
                    </div>
                </div>

                <!-- Directions for Strategic Improvement across Seven Dimensions (B2.1 & B2.2) -->
                <div class="profile-grid" style="margin-top: 2rem;">
                    <div class="card">
                        <h3>Directions for Strategic Improvement</h3>
                        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                            High-level institutional pathways derived from current scores across the 7 governance dimensions.
                        </p>
                        <ul class="improvement-list" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem;">
                            ${profile.improvementDirections.length > 0 ? profile.improvementDirections.map(d => `
                                <li class="improvement-item" style="display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.875rem 1rem; background: #fafafa; border: 1px solid var(--border-color); border-radius: var(--radius);">
                                    <span style="color: var(--color-primary-default); font-weight: 700; font-size: 1rem; line-height: 1.4;">→</span>
                                    <span style="font-size: 0.9375rem; color: var(--text-primary); line-height: 1.4;">${escapeHtml(d)}</span>
                                </li>
                            `).join('') : '<li class="muted" style="padding: 0.75rem;">No improvement directions generated.</li>'}
                        </ul>
                    </div>
                </div>

                <!-- Key Reflection Prompts (B2.1) -->
                <div class="profile-grid" style="margin-top: 2rem;">
                    <div class="card">
                        <h3>${this.currentRecord.team_mode ? 'Key Team Discussion Prompts' : 'Key Individual Reflection Prompts'}</h3>
                        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                            ${this.currentRecord.team_mode 
                                ? 'Facilitation questions designed for cross-functional governance review sessions and team deliberations.' 
                                : 'Inquiry prompts for individual practitioners to scrutinise assumptions and identify operational blind spots.'}
                        </p>
                        <div class="reflection-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                            ${profile.reflectionPrompts.map((p, idx) => `
                                <div class="reflection-card" style="padding: 1rem; border-left: 3px solid var(--color-primary-default); background: #fdfdfd; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); border-radius: 0 var(--radius) var(--radius) 0;">
                                    <span class="subtitle" style="display: block; margin-bottom: 0.25rem;">Prompt ${idx + 1}</span>
                                    <p style="margin: 0; font-size: 0.9375rem; font-weight: 500; color: var(--text-primary); line-height: 1.4;">${escapeHtml(p)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Evidence & Artefacts Portfolio (B2.4 & B3.3) -->
                <div class="profile-grid" style="margin-top: 2rem;">
                    <div class="card">
                        <h3>Evidence & Artefacts Portfolio</h3>
                        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                            Documented references, workflows, and decisions linked to support dimensional maturity claims.
                        </p>
                        
                        ${(() => {
                            const allArts = this.currentRecord.artefacts || [];
                            if (allArts.length === 0) {
                                return '<p class="muted" style="padding: 0.5rem 0;">No evidence references linked to this assessment.</p>';
                            }

                            const unlinked = allArts.filter(a => !a.dimensionId);
                            const dimensionGroups = this.schema.dimensions.map(dim => {
                                const arts = allArts.filter(a => a.dimensionId === dim.id);
                                return { dim, arts };
                            }).filter(g => g.arts.length > 0);

                            let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
                            
                            dimensionGroups.forEach(g => {
                                html += `
                                    <div class="evidence-group" style="border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem; background: #fafafa;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <strong style="font-size: 0.9375rem; color: var(--text-primary);">${escapeHtml(g.dim.name)}</strong>
                                            <span class="muted" style="font-size: 0.75rem;">${g.arts.length} reference${g.arts.length > 1 ? 's' : ''}</span>
                                        </div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                            ${g.arts.map(a => `
                                                <div class="pill-item" style="display: inline-flex; align-items: center; gap: 0.5rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: 20px; padding: 4px 10px; font-size: 0.8125rem;">
                                                    <span class="badge ${escapeAttr(a.type)}" style="font-size: 0.6875rem; padding: 2px 6px;">${escapeHtml(a.type)}</span>
                                                    <strong style="color: var(--text-primary);">${escapeHtml(a.ref)}</strong>
                                                    ${a.name && a.name !== a.ref ? `<span class="muted" style="font-size: 0.75rem;">— ${escapeHtml(a.name)}</span>` : ''}
                                                    <button type="button" class="pill-edit hide-in-print" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Edit evidence ${escapeAttr(a.ref)}" title="Edit reference" style="background: none; border: none; cursor: pointer; color: #555; font-size: 0.8125rem; line-height: 1; padding: 0 4px; margin-left: 2px;">✎</button>
                                                    <button type="button" class="pill-delete hide-in-print" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Remove evidence ${escapeAttr(a.ref)}" title="Remove reference" style="background: none; border: none; cursor: pointer; color: #888; font-size: 1.1rem; line-height: 1; padding: 0 4px; margin-left: 2px;">&times;</button>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            });

                            if (unlinked.length > 0) {
                                html += `
                                    <div class="evidence-group" style="border: 1px dashed var(--border-color); border-radius: var(--radius); padding: 1rem; background: #fdfdfd;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <strong style="font-size: 0.9375rem; color: var(--text-secondary);">General / Institutional Evidence (Legacy or Unlinked)</strong>
                                            <span class="muted" style="font-size: 0.75rem;">${unlinked.length} reference${unlinked.length > 1 ? 's' : ''}</span>
                                        </div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                            ${unlinked.map(a => `
                                                <div class="pill-item" style="display: inline-flex; align-items: center; gap: 0.5rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: 20px; padding: 4px 10px; font-size: 0.8125rem;">
                                                    <span class="badge ${escapeAttr(a.type)}" style="font-size: 0.6875rem; padding: 2px 6px;">${escapeHtml(a.type)}</span>
                                                    <strong style="color: var(--text-primary);">${escapeHtml(a.ref)}</strong>
                                                    ${a.name && a.name !== a.ref ? `<span class="muted" style="font-size: 0.75rem;">— ${escapeHtml(a.name)}</span>` : ''}
                                                    <button type="button" class="pill-edit hide-in-print" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Edit evidence ${escapeAttr(a.ref)}" title="Edit reference" style="background: none; border: none; cursor: pointer; color: #555; font-size: 0.8125rem; line-height: 1; padding: 0 4px; margin-left: 2px;">✎</button>
                                                    <button type="button" class="pill-delete hide-in-print" data-id="${escapeAttr(a.id || a.ref)}" aria-label="Remove evidence ${escapeAttr(a.ref)}" title="Remove reference" style="background: none; border: none; cursor: pointer; color: #888; font-size: 1.1rem; line-height: 1; padding: 0 4px; margin-left: 2px;">&times;</button>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            }

                            html += '</div>';
                            return html;
                        })()}
                    </div>
                </div>

                <!-- Institutional Portfolio -->
                <div class="profile-grid" style="margin-top: 2rem;">
                    <div class="card">
                        <h3>Institutional Portfolio</h3>
                        <div class="profile-column-container">
                            <div class="profile-column">
                                <h4 class="semibold">Strong Areas</h4>
                                <ul>${profile.strong.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li class="muted">None identified</li>'}</ul>
                            </div>
                            <div class="profile-column">
                                <h4 class="semibold">Developing Areas</h4>
                                <ul>${profile.developing.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li class="muted">None identified</li>'}</ul>
                            </div>
                            <div class="profile-column">
                                <h4 class="semibold">Strengthening Required</h4>
                                <ul>${profile.weak.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li class="muted">None identified</li>'}</ul>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Interpreted Patterns & Fragility Signals -->
                <div class="results-grid" style="margin-top: 2rem;">
                    <div class="card">
                        <h3>Interpreted Patterns</h3>
                        <div class="pattern-list">
                            ${profile.patterns.length > 0 ? profile.patterns.map(p => `
                                <div class="pattern-item">
                                    <strong class="semibold">${escapeHtml(p.name)}</strong>
                                    <p>${escapeHtml(p.implication)}</p>
                                </div>
                            `).join('') : '<p class="muted">No divergent patterns detected.</p>'}
                        </div>
                    </div>

                    <div class="card">
                        <h3>Governance Fragility Signals</h3>
                        <ul class="fragility-list">
                            ${profile.fragilitySignals.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li class="muted">No immediate fragility signals detected.</li>'}
                        </ul>
                    </div>
                </div>

                <div class="nav-buttons hide-in-print" style="margin-top: 3rem; justify-content: center; flex-wrap: wrap; gap: 0.75rem;">
                    <button type="button" class="secondary" id="jsonBtn">Export JSON</button>
                    <button type="button" class="secondary" id="mdBtn">Export Markdown</button>
                    <button type="button" class="primary" id="printBtn">Print Profile</button>
                    <button type="button" class="secondary" id="importResultsBtn">Import JSON</button>
                    <button type="button" class="secondary" id="historyResultsBtn">History Snapshots (${this.getHistory().length})</button>
                    <button type="button" class="secondary" id="compareBtn">Upload & Compare</button>
                    <button type="button" class="secondary" id="homeBtn">New Assessment</button>
                </div>
                <input type="file" id="importResultsUpload" style="display: none;" accept=".json">
                <input type="file" id="compareUpload" style="display: none;" accept=".json">

                <!-- Lightweight capability and governance layer -->
                <!-- Optional, non-blocking, and does not alter core workflow -->
                <div class="gov-layer-section" style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
                    <details class="gov-details">
                        <summary class="gov-summary">Capability & Governance Notes (Optional)</summary>
                        <div class="gov-content" style="padding-top: 1.5rem;">
                            <div class="gov-field">
                                <label for="capabilityNotes">Capability Notes</label>
                                <p class="gov-help">How this tool supports development of practical AI capability through structured interaction.</p>
                                <textarea id="capabilityNotes" class="gov-textarea" placeholder="Enter capability development notes..."></textarea>
                            </div>
                            <div class="gov-field" style="margin-top: 1.5rem;">
                                <label for="governanceNotes">Governance Notes</label>
                                <p class="gov-help">Make assumptions, risks, and decisions visible and reviewable.</p>
                                <textarea id="governanceNotes" class="gov-textarea" placeholder="Enter governance, risk, or rationale notes..."></textarea>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        `;

        // Safe DOM property assignment for capability and governance notes
        const capNotesArea = this.container.querySelector('#capabilityNotes') as HTMLTextAreaElement;
        if (capNotesArea) {
            capNotesArea.value = this.currentRecord.capabilityNotes || '';
            capNotesArea.addEventListener('input', (e) => {
                this.currentRecord.capabilityNotes = (e.target as HTMLTextAreaElement).value;
                this.saveToStorage();
            });
        }

        const govNotesArea = this.container.querySelector('#governanceNotes') as HTMLTextAreaElement;
        if (govNotesArea) {
            govNotesArea.value = this.currentRecord.governanceNotes || '';
            govNotesArea.addEventListener('input', (e) => {
                this.currentRecord.governanceNotes = (e.target as HTMLTextAreaElement).value;
                this.saveToStorage();
            });
        }

        // Revisit dimension buttons in detailed table (B3.3)
        this.container.querySelectorAll('.revisit-dim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetIdx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0', 10);
                this.currentDimensionIndex = targetIdx;
                this.render();
            });
        });

        // Revisit first unanswered dimension button from partial status banner
        this.container.querySelector('.revisit-first-unanswered-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const firstUnanswered = this.schema.dimensions.findIndex(d => this.currentRecord.scores[d.id] === undefined);
            if (firstUnanswered !== -1) {
                this.currentDimensionIndex = firstUnanswered;
                this.render();
            }
        });

        // Edit artefact reference button handler on results screen (B3.3)
        this.container.querySelectorAll('.pill-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const artId = (e.currentTarget as HTMLElement).getAttribute('data-id');
                const art = this.currentRecord.artefacts.find(a => (a.id || a.ref) === artId);
                if (art) {
                    const updated = await this.showEditArtefactModal(art);
                    if (updated) {
                        const idx = this.currentRecord.artefacts.findIndex(a => (a.id || a.ref) === artId);
                        if (idx !== -1) {
                            this.currentRecord.artefacts[idx] = updated;
                            this.saveToStorage();
                            this.render();
                        }
                    }
                }
            });
        });

        // Delete artefact reference button handler on results screen
        this.container.querySelectorAll('.pill-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const artId = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (artId) {
                    this.currentRecord.artefacts = this.currentRecord.artefacts.filter(a => (a.id || a.ref) !== artId);
                    this.saveToStorage();
                    this.render();
                }
            });
        });

        this.container.querySelector('#jsonBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const data = exportToJSON(this.currentRecord);
            const safeFileName = (this.currentRecord.organisation_name || 'assessment')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/gi, '-')
                .replace(/-+/g, '-');
            this.downloadFile(data, `governance-profile-${safeFileName}.json`, 'application/json');
        });

        this.container.querySelector('#mdBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const data = exportToMarkdown(this.currentRecord, profile, this.schema);
            const safeFileName = (this.currentRecord.organisation_name || 'assessment')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/gi, '-')
                .replace(/-+/g, '-');
            this.downloadFile(data, `governance-profile-${safeFileName}.md`, 'text/markdown');
        });

        this.container.querySelector('#printBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.print();
        });

        // Import Assessment JSON button from Results screen
        const importResultsInput = this.container.querySelector('#importResultsUpload') as HTMLInputElement;
        this.container.querySelector('#importResultsBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            importResultsInput?.click();
        });

        importResultsInput?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                importResultsInput.value = '';
                this.handleImportFile(file);
            }
        });

        // History Snapshots button from Results screen
        this.container.querySelector('#historyResultsBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showHistoryModal();
        });

        const compareInput = this.container.querySelector('#compareUpload') as HTMLInputElement;
        this.container.querySelector('#compareBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            compareInput?.click();
        });

        compareInput?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            // Reset input value immediately so user can re-upload the same file after correcting it
            compareInput.value = '';

            const reader = new FileReader();
            reader.onload = async (re) => {
                const rawContent = re.target?.result as string;
                let parsed: unknown;
                try {
                    parsed = JSON.parse(rawContent);
                } catch {
                    await this.showModal('Invalid JSON File', 'The uploaded file could not be parsed as JSON. Please ensure it is a valid assessment JSON file.');
                    return;
                }

                const validation = validateAssessmentRecord(parsed, this.schema.dimensions.map(d => d.id));
                if (!validation.isValid || !validation.record) {
                    const message = 'The comparison file is invalid:\n\n• ' + validation.errors.join('\n• ');
                    await this.showModal('Comparison Validation Failed', message);
                    return;
                }

                // Valid comparison file: calculate comparison and re-render
                this.renderResultsWithComparison(validation.record);
            };
            reader.readAsText(file);
        });

        this.container.querySelector('#homeBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveToHistory(); // Circular buffer save before clearing
            this.resetAssessment();
        });
    }

    private renderResultsWithComparison(previousRecord: AssessmentRecord) {
        this.renderResults(previousRecord);
    }

    private saveToHistory() {
        const history = this.getHistory();
        // Circular buffer of 5
        const newHistory = [this.currentRecord, ...history].slice(0, 5);
        saveHistoryToStorage(newHistory, window.localStorage);
    }

    private getHistory(): AssessmentRecord[] {
        return loadHistoryFromStorage(window.localStorage, this.schema.dimensions.map(d => d.id));
    }

    private resetAssessment() {
        clearAssessmentFromStorage(window.localStorage);
        this.currentDimensionIndex = -1;
        this.currentRecord = this.createNewRecord();
        this.render();
    }

    private saveToStorage() {
        saveAssessmentToStorage(this.currentRecord, window.localStorage);
    }

    private loadFromStorage(): AssessmentRecord | null {
        return loadAssessmentFromStorage(window.localStorage, this.schema.dimensions.map(d => d.id));
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
