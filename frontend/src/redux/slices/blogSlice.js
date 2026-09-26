import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axiosInstance';

const API_BASE_URL = '/api/blogs';

const getAuthToken = (role) => localStorage.getItem(`authToken_${role}`);
const getAuthConfig = (role) => {
  const token = getAuthToken(role);
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};
const d = (response) => response?.data?.data ?? response?.data ?? {};
const isOk = (response) => response?.data?.success || response?.data?.isError === false;

export const fetchBlogs = createAsyncThunk(
  'blog/fetchBlogs',
  async ({ page = 1, limit = 9, category = 'all', search = '', sortBy = 'createdAt', role = null }, { rejectWithValue }) => {
    try {
      const config = getAuthConfig(role);
      const params = { page, limit, sortBy, order: 'desc' };
      if (category !== 'all') params.category = category;
      if (search) params.search = search;

      const response = await axios.get(API_BASE_URL, { ...config, params });
      const payload = d(response);
      if (isOk(response)) {
        const blogs = Array.isArray(payload?.blogs) ? payload.blogs : Array.isArray(payload) ? payload : [];
        const pagination = payload?.pagination || { page: 1, pages: 1, total: blogs.length };
        return { blogs, pagination };
      }
      return rejectWithValue('Failed to fetch blogs');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch blogs');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'blog/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      const payload = d(response);
      if (isOk(response)) {
        return Array.isArray(payload?.categories) ? payload.categories : Array.isArray(payload) ? payload : [];
      }
      return rejectWithValue('Failed to fetch categories');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const fetchMyBlogs = createAsyncThunk(
  'blog/fetchMyBlogs',
  async ({ role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.get(`${API_BASE_URL}/my/blogs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 },
      });
      const payload = d(response);
      if (isOk(response)) {
        const blogs = Array.isArray(payload?.blogs) ? payload.blogs : Array.isArray(payload) ? payload : [];
        const totalLikes = blogs.reduce((sum, blog) => sum + (blog?.likesCount || 0), 0);
        const totalViews = blogs.reduce((sum, blog) => sum + (blog?.views || 0), 0);
        return { blogs, stats: { totalLikes, totalViews, totalBlogs: blogs.length } };
      }
      return rejectWithValue('Failed to fetch your blogs');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch your blogs');
    }
  }
);

export const fetchBlogById = createAsyncThunk(
  'blog/fetchBlogById',
  async ({ blogId, role }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${blogId}`, getAuthConfig(role));
      const payload = d(response);
      if (isOk(response)) return payload?.blog || payload;
      return rejectWithValue('Failed to fetch blog');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch blog');
    }
  }
);

export const createBlog = createAsyncThunk(
  'blog/createBlog',
  async ({ formData, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.post(API_BASE_URL, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const payload = d(response);
      if (isOk(response)) return payload?.blog || payload;
      return rejectWithValue('Failed to create blog');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create blog');
    }
  }
);

export const updateBlog = createAsyncThunk(
  'blog/updateBlog',
  async ({ blogId, formData, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.put(`${API_BASE_URL}/${blogId}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const payload = d(response);
      if (isOk(response)) return payload?.blog || payload;
      return rejectWithValue('Failed to update blog');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update blog');
    }
  }
);

export const deleteBlog = createAsyncThunk(
  'blog/deleteBlog',
  async ({ blogId, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.delete(`${API_BASE_URL}/${blogId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (isOk(response)) return blogId;
      return rejectWithValue('Failed to delete blog');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete blog');
    }
  }
);

export const toggleLike = createAsyncThunk(
  'blog/toggleLike',
  async ({ blogId, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.post(`${API_BASE_URL}/${blogId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = d(response);
      if (isOk(response)) {
        return { blogId, liked: payload?.liked, likesCount: payload?.likesCount };
      }
      return rejectWithValue('Failed to toggle like');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle like');
    }
  }
);

export const addComment = createAsyncThunk(
  'blog/addComment',
  async ({ blogId, content, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.post(`${API_BASE_URL}/${blogId}/comments`, { content }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = d(response);
      if (isOk(response)) {
        return { blogId, comment: payload?.comment, commentsCount: payload?.commentsCount };
      }
      return rejectWithValue('Failed to add comment');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

export const deleteComment = createAsyncThunk(
  'blog/deleteComment',
  async ({ blogId, commentId, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.delete(`${API_BASE_URL}/${blogId}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = d(response);
      if (isOk(response)) {
        return { blogId, commentId, commentsCount: payload?.commentsCount };
      }
      return rejectWithValue('Failed to delete comment');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete comment');
    }
  }
);

export const reportBlog = createAsyncThunk(
  'blog/reportBlog',
  async ({ blogId, reason, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.post(`${API_BASE_URL}/${blogId}/report`, { reason }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (isOk(response)) return { blogId, message: response.data?.message };
      return rejectWithValue('Failed to report blog');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to report blog');
    }
  }
);

export const fetchReportedBlogs = createAsyncThunk(
  'blog/fetchReportedBlogs',
  async ({ page = 1, role, limit = 100 }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.get(`${API_BASE_URL}/moderation/reported`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit },
      });
      const payload = d(response);
      if (isOk(response)) {
        const blogs = Array.isArray(payload?.blogs) ? payload.blogs : [];
        const pagination = payload?.pagination || { page: 1, pages: 1, total: blogs.length };
        return { blogs, pagination };
      }
      return rejectWithValue('Failed to fetch reported blogs');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reported blogs');
    }
  }
);

export const dismissReports = createAsyncThunk(
  'blog/dismissReports',
  async ({ blogId, role }, { rejectWithValue }) => {
    try {
      const token = getAuthToken(role);
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.put(`${API_BASE_URL}/${blogId}/moderation/dismiss`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (isOk(response)) return blogId;
      return rejectWithValue('Failed to dismiss reports');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to dismiss reports');
    }
  }
);

const initialState = {
  blogs: [],
  pagination: { page: 1, pages: 1, total: 0 },
  categories: [],
  filters: { category: 'all', search: '', sortBy: 'createdAt' },
  currentBlog: null,
  myBlogs: [],
  myBlogsStats: { totalLikes: 0, totalViews: 0, totalBlogs: 0 },
  reportedBlogs: [],
  reportedPagination: { page: 1, pages: 1, total: 0 },
  isLoading: false,
  isLoadingMyBlogs: false,
  isLoadingCurrentBlog: false,
  isSubmitting: false,
  error: null,
  successMessage: null,
};

const blogSlice = createSlice({
  name: 'blog',
  initialState,
  reducers: {
    setCategory: (state, action) => {
      state.filters.category = action.payload;
      state.pagination.page = 1;
    },
    setSearchQuery: (state, action) => {
      state.filters.search = action.payload;
      state.pagination.page = 1;
    },
    setSortBy: (state, action) => { state.filters.sortBy = action.payload; },
    setPage: (state, action) => { state.pagination.page = action.payload; },
    clearCurrentBlog: (state) => { state.currentBlog = null; },
    clearError: (state) => { state.error = null; },
    clearSuccessMessage: (state) => { state.successMessage = null; },
    resetFilters: (state) => {
      state.filters = { category: 'all', search: '', sortBy: 'createdAt' };
      state.pagination.page = 1;
    },
    hydrateReportedBlogs: (state, action) => {
      if (Array.isArray(action.payload?.blogs)) state.reportedBlogs = action.payload.blogs;
      if (action.payload?.pagination) state.reportedPagination = action.payload.pagination;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Blogs
      .addCase(fetchBlogs.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.blogs = Array.isArray(action.payload?.blogs) ? action.payload.blogs : [];
        state.pagination = action.payload?.pagination || { page: 1, pages: 1, total: state.blogs.length };
        state.isLoading = false;
      })
      .addCase(fetchBlogs.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      // Categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = Array.isArray(action.payload) ? action.payload : [];
      })

      // My Blogs
      .addCase(fetchMyBlogs.pending, (state) => { state.isLoadingMyBlogs = true; })
      .addCase(fetchMyBlogs.fulfilled, (state, action) => {
        state.myBlogs = Array.isArray(action.payload?.blogs) ? action.payload.blogs : [];
        state.myBlogsStats = action.payload?.stats || { totalLikes: 0, totalViews: 0, totalBlogs: state.myBlogs.length };
        state.isLoadingMyBlogs = false;
      })
      .addCase(fetchMyBlogs.rejected, (state, action) => { state.isLoadingMyBlogs = false; state.error = action.payload; })

      // Single Blog
      .addCase(fetchBlogById.pending, (state) => { state.isLoadingCurrentBlog = true; state.error = null; })
      .addCase(fetchBlogById.fulfilled, (state, action) => {
        state.currentBlog = action.payload;
        state.isLoadingCurrentBlog = false;
      })
      .addCase(fetchBlogById.rejected, (state, action) => { state.isLoadingCurrentBlog = false; state.error = action.payload; })

      // Create Blog
      .addCase(createBlog.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(createBlog.fulfilled, (state, action) => {
        if (action.payload) {
          state.blogs.unshift(action.payload);
          state.myBlogs.unshift(action.payload);
          state.myBlogsStats.totalBlogs += 1;
        }
        state.isSubmitting = false;
        state.successMessage = 'Blog created successfully!';
      })
      .addCase(createBlog.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

      // Update Blog
      .addCase(updateBlog.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(updateBlog.fulfilled, (state, action) => {
        const updatedBlog = action.payload;
        if (updatedBlog) {
          const idx = state.blogs.findIndex((b) => b._id === updatedBlog._id);
          if (idx !== -1) state.blogs[idx] = updatedBlog;
          const myIdx = state.myBlogs.findIndex((b) => b._id === updatedBlog._id);
          if (myIdx !== -1) state.myBlogs[myIdx] = updatedBlog;
          if (state.currentBlog?._id === updatedBlog._id) state.currentBlog = updatedBlog;
        }
        state.isSubmitting = false;
        state.successMessage = 'Blog updated successfully!';
      })
      .addCase(updateBlog.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

      // Delete Blog
      .addCase(deleteBlog.pending, (state) => { state.isSubmitting = true; })
      .addCase(deleteBlog.fulfilled, (state, action) => {
        const blogId = action.payload;
        state.blogs = state.blogs.filter((b) => b._id !== blogId);
        state.myBlogs = state.myBlogs.filter((b) => b._id !== blogId);
        state.myBlogsStats.totalBlogs = Math.max(0, state.myBlogsStats.totalBlogs - 1);
        if (state.currentBlog?._id === blogId) state.currentBlog = null;
        state.isSubmitting = false;
        state.successMessage = 'Blog deleted successfully!';
      })
      .addCase(deleteBlog.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

      // Like
      .addCase(toggleLike.fulfilled, (state, action) => {
        const { blogId, liked, likesCount } = action.payload || {};
        if (blogId) {
          const idx = state.blogs.findIndex((b) => b._id === blogId);
          if (idx !== -1) { state.blogs[idx].likesCount = likesCount; state.blogs[idx].isLiked = liked; }
          if (state.currentBlog?._id === blogId) { state.currentBlog.likesCount = likesCount; state.currentBlog.isLiked = liked; }
        }
      })

      // Comments
      .addCase(addComment.fulfilled, (state, action) => {
        const { blogId, comment, commentsCount } = action.payload || {};
        if (blogId && comment) {
          if (state.currentBlog?._id === blogId) {
            state.currentBlog.comments = state.currentBlog.comments || [];
            state.currentBlog.comments.push(comment);
            state.currentBlog.commentsCount = commentsCount;
          }
          const idx = state.blogs.findIndex((b) => b._id === blogId);
          if (idx !== -1) state.blogs[idx].commentsCount = commentsCount;
        }
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { blogId, commentId, commentsCount } = action.payload || {};
        if (blogId && commentId) {
          if (state.currentBlog?._id === blogId) {
            state.currentBlog.comments = (state.currentBlog.comments || []).filter((c) => c._id !== commentId);
            state.currentBlog.commentsCount = commentsCount;
          }
          const idx = state.blogs.findIndex((b) => b._id === blogId);
          if (idx !== -1) state.blogs[idx].commentsCount = commentsCount;
        }
      })

      // Reports & Moderation
      .addCase(reportBlog.fulfilled, (state, action) => {
        state.successMessage = action.payload?.message || 'Blog reported successfully';
      })
      .addCase(reportBlog.rejected, (state, action) => { state.error = action.payload; })

      .addCase(fetchReportedBlogs.pending, (state) => { state.isLoading = true; })
      .addCase(fetchReportedBlogs.fulfilled, (state, action) => {
        state.reportedBlogs = Array.isArray(action.payload?.blogs) ? action.payload.blogs : [];
        state.reportedPagination = action.payload?.pagination || { page: 1, pages: 1, total: state.reportedBlogs.length };
        state.isLoading = false;
        try {
          sessionStorage.setItem('reportedBlogsCache', JSON.stringify(action.payload));
        } catch (_) { /* ignore */ }
      })
      .addCase(fetchReportedBlogs.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(dismissReports.fulfilled, (state, action) => {
        const blogId = action.payload;
        state.reportedBlogs = state.reportedBlogs.filter((b) => b._id !== blogId);
        state.reportedPagination.total = Math.max(0, state.reportedPagination.total - 1);
        state.successMessage = 'Reports dismissed successfully';
      });
  },
});

export const {
  setCategory,
  setSearchQuery,
  setSortBy,
  setPage,
  clearCurrentBlog,
  clearError,
  clearSuccessMessage,
  resetFilters,
  hydrateReportedBlogs,
} = blogSlice.actions;

export const selectBlogs = (state) => state.blog?.blogs;
export const selectPagination = (state) => state.blog?.pagination;
export const selectCategories = (state) => state.blog?.categories;
export const selectFilters = (state) => state.blog?.filters;
export const selectCurrentBlog = (state) => state.blog?.currentBlog;
export const selectMyBlogs = (state) => state.blog?.myBlogs;
export const selectMyBlogsStats = (state) => state.blog?.myBlogsStats;
export const selectReportedBlogs = (state) => state.blog?.reportedBlogs;
export const selectIsLoading = (state) => state.blog?.isLoading;
export const selectIsLoadingMyBlogs = (state) => state.blog?.isLoadingMyBlogs;
export const selectIsLoadingCurrentBlog = (state) => state.blog?.isLoadingCurrentBlog;
export const selectIsSubmitting = (state) => state.blog?.isSubmitting;
export const selectError = (state) => state.blog?.error;
export const selectSuccessMessage = (state) => state.blog?.successMessage;

export default blogSlice.reducer;
