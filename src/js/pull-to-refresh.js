/**
 * Pull-to-Refresh functionality
 * Only activates when gesture starts within the header area (65px from top)
 */
export class PullToRefresh {
    constructor(options = {}) {
        this.headerHeight = options.headerHeight;
        this.threshold = options.threshold; // Distance to trigger refresh
        this.onRefresh = options.onRefresh || (() => window.location.reload());

        this.isTracking = false;
        this.startY = 0;
        this.currentY = 0;
        this.pullDistance = 0;

        this.indicator = null;

        this._init();
    }

    _init() {
        // Get indicator elements
        this.indicator = document.getElementById('pullToRefreshIndicator');
        this.arrowDown = this.indicator?.querySelector('.ptr-arrow-down');
        this.arrowUp = this.indicator?.querySelector('.ptr-arrow-up');

        if (!this.indicator) {
            console.warn('Pull-to-refresh indicator not found');
            return;
        }

        // Setup event listeners
        document.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this._handleTouchEnd(e));
        document.addEventListener('touchcancel', (e) => this._handleTouchEnd(e));
    }

    _handleTouchStart(e) {
        // Only activate if:
        // 1. Touch starts within header area (Y <= headerHeight)
        // 2. Page is scrolled to top (scrollY === 0)
        const touchY = e.touches[0].clientY;
        const isInHeader = touchY <= this.headerHeight;
        const isAtTop = window.scrollY === 0;

        if (isInHeader && isAtTop) {
            this.isTracking = true;
            this.startY = touchY;
            this.currentY = touchY;
            this.pullDistance = 0;
        }
    }

    _handleTouchMove(e) {
        if (!this.isTracking) return;

        this.currentY = e.touches[0].clientY;
        this.pullDistance = Math.max(0, this.currentY - this.startY);

        // Prevent default scroll if pulling down
        if (this.pullDistance > 0) {
            e.preventDefault();
        }

        // Update indicator
        if (this.pullDistance <= this.threshold) {
            this._updateIndicator();
        }

    }

    _handleTouchEnd(e) {
        if (!this.isTracking) return;

        const shouldRefresh = this.pullDistance >= this.threshold;

        if (shouldRefresh) {
            // Trigger refresh
            this._triggerRefresh();
        } else {
            // Reset indicator
            this._resetIndicator();
        }

        this.isTracking = false;
        this.pullDistance = 0;
    }

    _updateIndicator() {
        if (!this.indicator) return;

        // Calculate progress (0-1)
        const progress = Math.min(this.pullDistance / this.threshold, 1);

        // Update indicator position and opacity
        const translateY = this.pullDistance * 0.5; // Move slower than finger
        const opacity = progress; // Arrow opacity increases with progress

        this.indicator.style.transform = `translateY(${translateY}px)`;
        this.indicator.style.opacity = opacity;
    }

    _triggerRefresh() {
        if (!this.indicator) return;

        // Swap arrows: Hide down, show up
        if (this.arrowDown) this.arrowDown.classList.add('hidden');
        if (this.arrowUp) this.arrowUp.classList.remove('hidden');

        // Ensure we are at full opacity/position
        this.indicator.style.transform = 'translateY(40px)';
        this.indicator.style.opacity = '1';

        this._resetIndicator();
        this.onRefresh();
    }

    _resetIndicator() {
        if (!this.indicator) return;

        // Animate back to hidden state
        this.indicator.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        this.indicator.style.transform = 'translateY(0)';
        this.indicator.style.opacity = '0';

        // Reset transition and arrows after animation
        setTimeout(() => {
            this.indicator.style.transition = '';

            // Reset arrows state
            if (this.arrowDown) this.arrowDown.classList.remove('hidden');
            if (this.arrowUp) this.arrowUp.classList.add('hidden');
        }, 300);
    }
}
