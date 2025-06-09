import toast from 'react-hot-toast';

export const successToast = (message) => {
    toast.remove();
    toast.success(message)
}

export const errorToast = (message) => {
    toast.remove();
    toast.error(message);
}


