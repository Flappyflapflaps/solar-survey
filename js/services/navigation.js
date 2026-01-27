// Navigation and progress tracking service

import { $, $$, on } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';

class NavigationService {
    constructor() {
        this.sections = [];
        this.navItems = [];
        this.currentSection = '';
        this.progressFill = null;
        this.progressText = null;
        this.cleanupFunctions = [];
    }

    init() {
        this.sections = $$('.form-section');
        this.navItems = $$('.nav-item');
        this.progressFill = $('#progressFill');
        this.progressText = $('#progressText');
        
        this.setupScrollTracking();
        this.setupNavigationLinks();
        this.setupNavToggle();
    }

    setupScrollTracking() {
        const handleScroll = debounce(() => {
            this.updateActiveSection();
        }, 100);
        
        const cleanup = on(window, 'scroll', handleScroll);
        this.cleanupFunctions.push(cleanup);
        
        // Initial update
        this.updateActiveSection();
    }

    updateActiveSection() {
        let current = '';
        const scrollPosition = window.pageYOffset || window.scrollY;
        
        this.sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollPosition >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });
        
        if (current !== this.currentSection) {
            this.currentSection = current;
            this.updateNavHighlight(current);
        }
    }

    updateNavHighlight(sectionId) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            if (href && href.substring(1) === sectionId) {
                item.classList.add('active');
            }
        });
    }

    setupNavigationLinks() {
        this.navItems.forEach(link => {
            const cleanup = on(link, 'click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.scrollToSection(targetId);
                this.toggleNavigation();
            });
            this.cleanupFunctions.push(cleanup);
        });
    }

    scrollToSection(sectionId) {
        const targetElement = $(`#${sectionId}`);
        if (targetElement) {
            targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    setupNavToggle() {
        const navToggle = $('#navToggle');
        const navItems = $('#navItems');
        
        if (navToggle && navItems) {
            const cleanup = on(navToggle, 'click', () => {
                this.toggleNavigation();
            });
            this.cleanupFunctions.push(cleanup);
        }
    }

    toggleNavigation() {
        const navItems = $('#navItems');
        if (navItems) {
            navItems.classList.toggle('active');
        }
    }

    updateProgress(filled, total) {
        if (!this.progressFill || !this.progressText) return;
        
        const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = percentage + '%';
    }

    calculateProgress(formElement, roofAspectCount) {
        const inputs = formElement.querySelectorAll(
            'input[type="text"], input[type="tel"], input[type="email"], input[type="number"], select, textarea'
        );
        
        let filled = 0;
        let total = 0;
        
        inputs.forEach(input => {
            if (input.name && !input.name.includes('_file') && input.type !== 'hidden') {
                total++;
                if (input.value && input.value.trim() !== '') {
                    filled++;
                }
            }
        });
        
        // Count roof aspect fields
        for (let i = 1; i <= roofAspectCount; i++) {
            const aspect = $(`#roofAspect${i}`);
            if (aspect) {
                const aspectInputs = aspect.querySelectorAll('input, select, textarea');
                aspectInputs.forEach(input => {
                    if (input.name && input.type !== 'hidden') {
                        total++;
                        if (input.value && input.value.trim() !== '') {
                            filled++;
                        }
                    }
                });
            }
        }
        
        return { filled, total };
    }

    destroy() {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        this.sections = [];
        this.navItems = [];
        this.progressFill = null;
        this.progressText = null;
    }
}

// Export singleton instance
const navigationService = new NavigationService();
export { navigationService };

