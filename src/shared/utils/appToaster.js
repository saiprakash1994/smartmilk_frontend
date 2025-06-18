import toast from 'react-hot-toast';

export const successToast = (message) => {
    toast.remove();
    toast.success(message, {
        duration: 3000,
        position: 'top-center',
        style: {
            background: '#10B981',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '12px',
            padding: '16px 20px',
            fontSize: '14px',
            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)',
        },
    });
}

export const errorToast = (message) => {
    toast.remove();
    toast.error(message, {
        duration: 4000,
        position: 'top-center',
        style: {
            background: '#EF4444',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '12px',
            padding: '16px 20px',
            fontSize: '14px',
            boxShadow: '0 8px 25px rgba(239, 68, 68, 0.25)',
        },
    });
}

export const infoToast = (message, options = {}) => {
    toast.remove();
    toast(message, {
        duration: 3000,
        position: 'top-right',
        style: {
            background: '#3B82F6',
            color: '#ffffff',
            fontWeight: '500',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        },
        icon: 'ℹ️',
        ...options
    });
}


