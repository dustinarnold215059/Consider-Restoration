/**
 * Toast Notification System
 * Replaces alert() dialogs with professional toast notifications
 */

class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        this.container = document.querySelector('.toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000, title = '') {
        const toast = this.createToast(message, type, title);
        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        return toast;
    }

    createToast(message, type, title) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const header = document.createElement('div');
        header.className = 'toast-header';

        if (title) {
            const titleElement = document.createElement('span');
            titleElement.textContent = title;
            header.appendChild(titleElement);
        }

        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => this.removeToast(toast);
        header.appendChild(closeButton);

        const body = document.createElement('div');
        body.className = 'toast-body';
        body.textContent = message;

        if (title) {
            toast.appendChild(header);
        } else {
            // If no title, add close button to body area
            const bodyContainer = document.createElement('div');
            bodyContainer.style.display = 'flex';
            bodyContainer.style.justifyContent = 'space-between';
            bodyContainer.style.alignItems = 'flex-start';
            bodyContainer.appendChild(body);
            bodyContainer.appendChild(closeButton);
            toast.appendChild(bodyContainer);
        }

        if (title) {
            toast.appendChild(body);
        }

        return toast;
    }

    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, title = 'Success', duration = 4000) {
        return this.show(message, 'success', duration, title);
    }

    error(message, title = 'Error', duration = 8000) {
        return this.show(message, 'error', duration, title);
    }

    warning(message, title = 'Warning', duration = 6000) {
        return this.show(message, 'warning', duration, title);
    }

    info(message, title = '', duration = 5000) {
        return this.show(message, 'info', duration, title);
    }

    // Method to replace alert() calls
    alert(message, type = 'info') {
        switch(type) {
            case 'success':
                this.success(message);
                break;
            case 'error':
                this.error(message);
                break;
            case 'warning':
                this.warning(message);
                break;
            default:
                this.info(message);
        }
    }
}

// Create global instance
const Toast = new ToastNotification();

// Make it available globally
window.Toast = Toast;

// Optional: Override alert function (uncomment if you want to replace all alert calls)
// const originalAlert = window.alert;
// window.alert = function(message) {
//     Toast.info(message, 'Alert');
// };