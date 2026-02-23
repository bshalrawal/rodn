
// Notification System
function showNotification(message, type = 'info') {
    let container = document.getElementById('adminNotificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'adminNotificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.textContent = message;

    // Basic Styles
    notification.style.cssText = `
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        min-width: 300px;
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
    `;

    // Click to dismiss
    notification.onclick = () => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    };

    container.appendChild(notification);

    // Auto dismiss
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Override global alert for backward compatibility if desired, 
// or simpler: just expose helpers globally
window.showSuccess = (msg) => showNotification(msg, 'success');
window.showError = (msg) => showNotification(msg, 'error');
window.showWarning = (msg) => showNotification(msg, 'warning');
