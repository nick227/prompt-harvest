// Navigation Controls and Buttons
import { UIConfig } from './ui-config.js';

export class NavigationControls {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new UIConfig();
    }

    createNavigationControls() {
        const navControls = this.uiConfig.createElement('div');

        navControls.className = 'nav-controls';
        navControls.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            align-items: center;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px 20px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
            z-index: 1000;
        `;

        return navControls;
    }

    createButton(text) {
        if (!text) {
            throw new Error('Button text is required');
        }

        const button = this.uiConfig.createElement('button');

        button.textContent = text;
        button.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        `;

        // Add hover effects
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(255, 255, 255, 0.2)';
            button.style.transform = 'translateY(-1px)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.transform = 'translateY(0)';
        });

        return button;
    }

    createToggleButton() {
        const button = this.uiConfig.createElement('button');

        button.className = 'info-toggle-btn-nav';
        button.innerHTML = 'ℹ️';
        button.title = 'Toggle Info';
        button.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 16px;
            cursor: pointer;
            min-width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        `;

        return button;
    }

    createPublicStatusToggle(isPublic) {
        if (typeof isPublic !== 'boolean') {
            throw new Error('isPublic must be a boolean value');
        }

        const container = this.uiConfig.createElement('div');

        container.className = 'public-status-toggle-container';
        container.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.8);
            padding: 8px 12px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            transition: all 0.2s ease;
            cursor: pointer;
            min-width: 120px;
            height: 36px;
        `;

        // Create checkbox
        const checkbox = this.uiConfig.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.checked = isPublic;
        checkbox.className = 'public-status-checkbox';
        checkbox.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #4ade80;
        `;

        // Create label
        const label = this.uiConfig.createElement('span');

        label.textContent = 'Public';
        label.className = 'public-status-label';
        label.style.cssText = `
            color: white;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            user-select: none;
        `;

        // Add hover effects to container
        container.addEventListener('mouseenter', () => {
            container.style.transform = 'scale(1.05)';
            container.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
            container.style.borderColor = 'rgba(74, 222, 128, 0.5)';
        });

        container.addEventListener('mouseleave', () => {
            container.style.transform = 'scale(1)';
            container.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
            container.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });

        // Add click handler to container (for better UX)
        container.addEventListener('click', e => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        container.appendChild(checkbox);
        container.appendChild(label);

        return container;
    }

    createRatingDisplay(rating) {
        const ratingDisplay = this.uiConfig.createElement('div');

        ratingDisplay.className = 'rating-display';
        ratingDisplay.innerHTML = rating === '-' ? '-' : `★ ${rating}`;
        ratingDisplay.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: #ffd700;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            border: 1px solid rgba(255, 215, 0, 0.3);
            backdrop-filter: blur(10px);
            min-width: 60px;
            text-align: center;
        `;

        return ratingDisplay;
    }

    createNavigationSpacer() {
        const spacer = this.uiConfig.createElement('div');

        spacer.className = 'nav-spacer';
        spacer.style.cssText = `
            width: 1px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            margin: 0 5px;
        `;

        return spacer;
    }
}
