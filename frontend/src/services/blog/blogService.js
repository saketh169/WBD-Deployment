import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const getAllBlogs = (params = {}) =>
  makeRequest(() => axiosInstance.get('/api/blogs', { params }));

export const getBlogById = (id) =>
  makeRequest(() => axiosInstance.get(`/api/blogs/${id}`));

export const getCategories = () =>
  makeRequest(() => axiosInstance.get('/api/blogs/categories'));

export const getMyBlogs = () =>
  makeRequest(() => axiosInstance.get('/api/blogs/my/blogs'));

export const createBlog = (blogData) => {
  const isFormData = blogData instanceof FormData;
  return makeRequest(() =>
    axiosInstance.post('/api/blogs', blogData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
  );
};

export const updateBlog = (id, blogData) => {
  const isFormData = blogData instanceof FormData;
  return makeRequest(() =>
    axiosInstance.put(`/api/blogs/${id}`, blogData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
  );
};

export const deleteBlog = (id) =>
  makeRequest(() => axiosInstance.delete(`/api/blogs/${id}`));

export const toggleLike = (id) =>
  makeRequest(() => axiosInstance.post(`/api/blogs/${id}/like`));

export const addComment = (id, comment) =>
  makeRequest(() => axiosInstance.post(`/api/blogs/${id}/comments`, { comment }));

export const deleteComment = (id, commentId) =>
  makeRequest(() => axiosInstance.delete(`/api/blogs/${id}/comments/${commentId}`));

export const reportBlog = (id, reason) =>
  makeRequest(() => axiosInstance.post(`/api/blogs/${id}/report`, { reason }));

export const getPendingBlogs = () =>
  makeRequest(() => axiosInstance.get('/api/blogs/moderation/pending'));

export const moderateBlog = (id, action) =>
  makeRequest(() => axiosInstance.post(`/api/blogs/${id}/moderation`, { action }));
