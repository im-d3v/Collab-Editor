import API from '../api';

export const fetchDocument = async (id) => {
  try {
    return await API.get(`/documents/${id}`);
  } catch (error) {
    return error;
  }
};

export const getChatHistory = async (id) => {
  try {
    return await API.get(`/documents/${id}/chat`);
  } catch (error) {
    return error;
  }
};
