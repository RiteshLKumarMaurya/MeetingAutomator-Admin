import apiClient from '@/lib/apiClient';
import type {
  ApiResponse, PageResponse, ServiceResponse, ProjectResponse,
  ProjectBundleResponse, PackageResponse, TechnologyResponse,
  TestimonialResponse, BannerResponse,
 AuthResponse,
  PhonePasswordLoginResponse, PhonePasswordRegisterResponse,
  GoogleLoginRequest, LoginRequest, PhonePasswordRegisterRequest,TechnicalIssueHandleSettingResponse,SettingResponse,
  LogoutRequest, UserProfileResponse, AdminUserSummaryResponse,NotificationResponse, RoleResponse, RoleRequest,
  FeatureResponse, LinkResponse, WebLinkResponse,
  MediaResponse,
ProjectTechnologyResponse, ProjectExternalLinkResponse, AddProjectTechnologyRequest, AddProjectLinkRequest,
  AvailableSlotResponse, CreateConsultationBookingRequest, ConsultationBookingResponse,
  GuestBookingManagementResponse, GuestRescheduleBookingRequest, GuestCancelBookingRequest, BookingDashboardResponse, ConsultationBookingSummaryResponse, BookingDetailsResponse, AdminBookingFilterRequest, BookingActionRequest, ConsultationSettingsResponse, UpdateConsultationSettingsRequest
} from '@/types';

import { 
  ChangePhoneNumberRequest, 
  ChangePassworRequest,ChangePasswordResponse,
  AddressResponse,CreateAddressRequest,UpdateAddressRequest,
  UpdateProfileRequestDto,ChangePhoneNumberResponse,
} from '@/types';
import { toast } from 'react-hot-toast';

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  googleLogin: (data: GoogleLoginRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/login/google', data),
  phoneLogin: (data: LoginRequest) =>
    apiClient.post<ApiResponse<PhonePasswordLoginResponse>>('/api/v1/auth/login/phone-pass', data),
  register: (data: PhonePasswordRegisterRequest) =>
    apiClient.post<ApiResponse<PhonePasswordRegisterResponse>>('/api/v1/auth/register/phone-pass', data),
  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/api/v1/auth/tokens/refresh', { refreshToken }),
  validateToken: (token: string) =>
    apiClient.post<ApiResponse<boolean>>('/api/v1/auth/tokens/validate', { token }),
  logout: (data?: LogoutRequest) =>
    apiClient.post<ApiResponse<string>>('/api/v1/auth/logout', data ?? {}),
 changePhone: (data: ChangePhoneNumberRequest) =>
    apiClient.put<ApiResponse<ChangePhoneNumberResponse>>('/api/v1/auth/phone/change', data),
// In authApi object
changePassword: (data: { currentPassword: string; newPassword: string }) =>
  apiClient.put<ApiResponse<ChangePasswordResponse>>('/api/v1/auth/password/change', data),
};



// ─── Public Services ─────────────────────────────────────────
export const servicesApi = {
  getAll: () => apiClient.get<ApiResponse<ServiceResponse[]>>('/api/v1/public/services'),
  getBySlug: (slug: string) => apiClient.get<ApiResponse<ServiceResponse>>(`/api/v1/public/services/${slug}`),
};

// ─── Public Projects ─────────────────────────────────────────
export const projectsApi = {
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<ProjectResponse>>>('/api/v1/public/projects', { params }),
  getFeatured: () => apiClient.get<ApiResponse<ProjectResponse[]>>('/api/v1/public/projects/featured'),
  getBySlug: (slug: string) => apiClient.get<ApiResponse<ProjectResponse>>(`/api/v1/public/projects/${slug}`),
};

// ─── Public Project Bundles ───────────────────────────────────
export const projectBundlesApi = {
  getActive: () => apiClient.get<ApiResponse<ProjectBundleResponse[]>>('/api/v1/public/project-bundles/active'),
  getFeatured: () => apiClient.get<ApiResponse<ProjectBundleResponse[]>>('/api/v1/public/project-bundles/featured'),
  getBySlug: (slug: string) => apiClient.get<ApiResponse<ProjectBundleResponse>>(`/api/v1/public/project-bundles/slug/${slug}`),
};

// ─── Public Packages ─────────────────────────────────────────
export const packagesApi = {
  getAll: () => apiClient.get<ApiResponse<PackageResponse[]>>('/api/v1/public/packages'),
  getFeatured: () => apiClient.get<ApiResponse<PackageResponse[]>>('/api/v1/public/packages/featured'),
  getBySlug: (slug: string) => apiClient.get<ApiResponse<PackageResponse>>(`/api/v1/public/packages/slug/${slug}`),
};

// ─── Public Technologies ─────────────────────────────────────
export const technologiesApi = {
  getAll: () => apiClient.get<ApiResponse<TechnologyResponse[]>>('/api/v1/public/technologies'),
  getBySlug: (slug: string) => apiClient.get<ApiResponse<TechnologyResponse>>(`/api/v1/public/technologies/${slug}`),
};

// ─── Public Testimonials ─────────────────────────────────────
export const testimonialsApi = {
  getAll: (params?: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<TestimonialResponse>>>('/api/v1/public/testimonials', { params }),
  getFeatured: () => apiClient.get<ApiResponse<TestimonialResponse[]>>('/api/v1/public/testimonials/featured'),
  getById: (id: number) => apiClient.get<ApiResponse<TestimonialResponse>>(`/api/v1/public/testimonials/details/${id}`),
};

// ─── Public Banners ──────────────────────────────────────────
export const bannersApi = {
  getAll: () => apiClient.get<ApiResponse<BannerResponse[]>>('/api/v1/banners'),
};


// ─── Public Features ─────────────────────────────────────────
export const featuresApi = {
  getAll: () => apiClient.get<ApiResponse<FeatureResponse[]>>('/api/v1/public/features'),
};

// ─── Public Links / Web-links ────────────────────────────────
export const linksApi = {
  getAll: () => apiClient.get<ApiResponse<LinkResponse[]>>('/api/v1/public/links'),
  getWebLinks: () => apiClient.get<ApiResponse<WebLinkResponse[]>>('/api/v1/public/web-links'),
  getWebLinkByType: (type: string) => apiClient.get<ApiResponse<WebLinkResponse>>(`/api/v1/public/web-links/${type}`),
};

// ─── Settings ────────────────────────────────────────────────
export const settingsApi = {
  getPublic: () =>
    apiClient.get<ApiResponse<{ technicalIssueSetting: { enabled: boolean; message: string } }>>('/api/v1/public/settings'),
  getTechnicalIssue: () =>
    apiClient.get<ApiResponse<{ enabled: boolean; message: string }>>('/api/v1/public/settings/technical-issue'),
};


// ─── User (authenticated) ────────────────────────────────────
export const userApi = {
  getMe: () => apiClient.get<ApiResponse<UserProfileResponse>>('/api/v1/users/me'),

  updateMe: (data: UpdateProfileRequestDto) =>
    apiClient.patch<ApiResponse<UserProfileResponse>>('/api/v1/users/me', data),

  // ✅ Profile image upload (multipart)
  changeProfileImage: (formData: FormData) =>
    apiClient.patch<ApiResponse<MediaResponse>>(
      '/api/v1/users/profile-image/change',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

  // ✅ Addresses – correct base path (matches your AddressController)
  getAddresses: () =>
    apiClient.get<ApiResponse<AddressResponse[]>>('/api/v1/addresses/me'),

  addAddress: (data: CreateAddressRequest) =>
    apiClient.post<ApiResponse<AddressResponse>>('/api/v1/addresses/me', data),

  updateAddress: (id: number, data: UpdateAddressRequest) =>
    apiClient.put<ApiResponse<AddressResponse>>(`/api/v1/addresses/me/${id}`, data),

  deleteAddress: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/addresses/me/${id}`),

  setDefaultAddress: (id: number) =>
    apiClient.patch<ApiResponse<void>>(`/api/v1/addresses/me/${id}/default`),

  addPhone: (data: { countryCode: string; phoneNumber: string; password: string }) =>
  apiClient.post<ApiResponse<UserProfileResponse>>('/api/v1/users/add-phone-pass', data),
};





// ─── Admin ───────────────────────────────────────────────────
export const adminApi = {
  // ── Users ──────────────────────────────────────────────────
  getUsers: (params?: { page?: number; size?: number; sort?: string }) =>
    apiClient.get<ApiResponse<PageResponse<AdminUserSummaryResponse>>>('/api/v1/admin/users', {
      params: { sort: 'createdAt,DESC', ...params },
    }),
getUserById: (id: number) => apiClient.get<ApiResponse<UserProfileResponse>>(`/api/v1/admin/users/${id}`),  blockUser: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/users/${id}/block`),
  unblockUser: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/users/${id}/unblock`),
  changeUserRole: (id: number, roleName: string) =>
    apiClient.patch<ApiResponse<void>>(`/api/v1/admin/users/${id}/roles`, null, { params: { roleName } }),
  deleteUser: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/users/${id}/delete`),
  // ── Roles ──────────────────────────────────────────────────
  getRoles: () => apiClient.get<ApiResponse<RoleResponse[]>>('/api/v1/admin/roles'),
  getRoleById: (id: number) => apiClient.get<ApiResponse<RoleResponse>>(`/api/v1/admin/roles/${id}`),
  createRole: (data: RoleRequest) => apiClient.post<ApiResponse<RoleResponse>>('/api/v1/admin/roles', data),
  updateRole: (id: number, data: RoleRequest) => apiClient.put<ApiResponse<RoleResponse>>(`/api/v1/admin/roles/${id}`, data),
  deleteRole: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/roles/${id}`),

  // ── Projects ───────────────────────────────────────────────
  getProjects: (params?: { page?: number; size?: number; sortBy?: string; direction?: string }) =>
    apiClient.get<ApiResponse<PageResponse<ProjectResponse>>>('/api/v1/admin/projects', {
      params: { sortBy: 'createdAt', direction: 'DESC', ...params },
    }),
  getProjectById: (id: number) => apiClient.get<ApiResponse<ProjectResponse>>(`/api/v1/admin/projects/${id}`),
  createProject: (data: FormData) =>
    apiClient.post<ApiResponse<ProjectResponse>>('/api/v1/admin/projects', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateProject: (id: number, data: FormData) =>
    apiClient.put<ApiResponse<ProjectResponse>>(`/api/v1/admin/projects/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProject: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/projects/${id}`),
  enableProject: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/projects/${id}/enable`),
  disableProject: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/projects/${id}/disable`),
  featureProject: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/projects/${id}/feature`),
  unfeatureProject: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/projects/${id}/unfeature`),

  // ── Project Technologies (add/remove one at a time — same pattern as
  //    addServiceToPackage / removeServiceFromPackage) ───────────────
  addTechnologyToProject: (projectId: number, data: AddProjectTechnologyRequest) =>
    apiClient.post<ApiResponse<ProjectTechnologyResponse>>(`/api/v1/admin/projects/${projectId}/technologies`, data),
  removeTechnologyFromProject: (projectId: number, mappingId: number) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/admin/projects/${projectId}/technologies/${mappingId}`),

  // ── Project External Links (add/remove one at a time) ─────────────
  addLinkToProject: (projectId: number, data: AddProjectLinkRequest) =>
    apiClient.post<ApiResponse<ProjectExternalLinkResponse>>(`/api/v1/admin/projects/${projectId}/links`, data),
  removeLinkFromProject: (projectId: number, mappingId: number) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/admin/projects/${projectId}/links/${mappingId}`),

  // ── Project Bundles ────────────────────────────────────────
  getBundles: (params?: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<ProjectBundleResponse>>>('/api/v1/admin/project-bundles', { params }),
  getBundleById: (id: number) => apiClient.get<ApiResponse<ProjectBundleResponse>>(`/api/v1/admin/project-bundles/${id}`),
  createBundle: (data: FormData) =>
    apiClient.post<ApiResponse<ProjectBundleResponse>>('/api/v1/admin/project-bundles', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateBundle: (id: number, data: FormData) =>
    apiClient.put<ApiResponse<ProjectBundleResponse>>(`/api/v1/admin/project-bundles/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteBundle: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/project-bundles/${id}`),
  enableBundle: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/project-bundles/${id}/enable`),
  disableBundle: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/project-bundles/${id}/disable`),

  // ── Packages ───────────────────────────────────────────────
  getPackages: (params?: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<PackageResponse>>>('/api/v1/admin/packages', {
      params: { sortBy: 'displayOrder', direction: 'ASC', ...params },
    }),
  getPackageById: (id: number) => apiClient.get<ApiResponse<PackageResponse>>(`/api/v1/admin/packages/${id}`),
  deletePackage: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/packages/${id}`),
  enablePackage: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/packages/${id}/enable`),
  disablePackage: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/packages/${id}/disable`),
  featurePackage: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/packages/${id}/feature`),
  unfeaturePackage: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/packages/${id}/unfeature`),
  getPackageServices: (packageId: number) =>
    apiClient.get<ApiResponse<unknown[]>>(`/api/v1/admin/packages/${packageId}/services`),
  addServiceToPackage: (packageId: number, data: { serviceId: number; displayOrder: number; highlighted: boolean }) =>
    apiClient.post<ApiResponse<unknown>>(`/api/v1/admin/packages/${packageId}/services`, data),
  removeServiceFromPackage: (packageId: number, mappingId: number) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/admin/packages/${packageId}/services/${mappingId}`),
// in services/api.ts inside adminApi
createPackage: (data: FormData) =>
  apiClient.post<ApiResponse<PackageResponse>>('/api/v1/admin/packages', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
updatePackage: (id: number, data: FormData) =>
  apiClient.put<ApiResponse<PackageResponse>>(`/api/v1/admin/packages/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  
  // ── Services ───────────────────────────────────────────────
  getServices: (params?: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<ServiceResponse>>>('/api/v1/admin/services', {
      params: { sortBy: 'displayOrder', direction: 'ASC', ...params },
    }),
  getServiceById: (id: number) => apiClient.get<ApiResponse<ServiceResponse>>(`/api/v1/admin/services/${id}`),
createService: (data: FormData) =>
  apiClient.post<ApiResponse<ServiceResponse>>('/api/v1/admin/services', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
updateService: (id: number, data: FormData) =>
  apiClient.put<ApiResponse<ServiceResponse>>(`/api/v1/admin/services/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
// plus getServices, delete, enable, disable, feature, unfeature
  deleteService: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/services/${id}`),
  enableService: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/services/${id}/enable`),
  disableService: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/services/${id}/disable`),
  featureService: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/services/${id}/feature`),
  unfeatureService: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/services/${id}/unfeature`),

  // ── Technologies ───────────────────────────────────────────
  // inside adminApi object
getTechnologies: (params?: { page?: number; size?: number }) =>
  apiClient.get<ApiResponse<PageResponse<TechnologyResponse>>>('/api/v1/admin/technologies', { params }),
createTechnology: (data: FormData) =>
  apiClient.post<ApiResponse<TechnologyResponse>>('/api/v1/admin/technologies', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
updateTechnology: (id: number, data: FormData) =>
  apiClient.put<ApiResponse<TechnologyResponse>>(`/api/v1/admin/technologies/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
enableTechnology: (id: number) =>
  apiClient.patch<ApiResponse<TechnologyResponse>>(`/api/v1/admin/technologies/${id}/enable`),
disableTechnology: (id: number) =>
  apiClient.patch<ApiResponse<TechnologyResponse>>(`/api/v1/admin/technologies/${id}/disable`),
deleteTechnology: (id: number) =>
  apiClient.delete<ApiResponse<void>>(`/api/v1/admin/technologies/${id}`),

  // ── Features ───────────────────────────────────────────────
  getFeatures: (params?: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<FeatureResponse>>>('/api/v1/admin/features', { params }),
  getFeatureById: (id: number) => apiClient.get<ApiResponse<FeatureResponse>>(`/api/v1/admin/features/${id}`),
  createFeature: (data: FormData) =>
    apiClient.post<ApiResponse<FeatureResponse>>('/api/v1/admin/features', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateFeature: (id: number, data: FormData) =>
    apiClient.put<ApiResponse<FeatureResponse>>(`/api/v1/admin/features/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteFeature: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/features/${id}`),
  enableFeature: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/features/${id}/enable`),
  disableFeature: (id: number) => apiClient.patch<ApiResponse<void>>(`/api/v1/admin/features/${id}/disable`),

  // ── Testimonials ───────────────────────────────────────────
 getTestimonials: (params: { page: number; size: number }) =>
  apiClient.get<ApiResponse<PageResponse<TestimonialResponse>>>('/api/v1/admin/testimonials', { params }),
createTestimonial: (data: FormData) =>
  apiClient.post<ApiResponse<TestimonialResponse>>('/api/v1/admin/testimonials', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
updateTestimonial: (id: number, data: FormData) =>
  apiClient.put<ApiResponse<TestimonialResponse>>(`/api/v1/admin/testimonials/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
enableTestimonial: (id: number) =>
  apiClient.patch<ApiResponse<TestimonialResponse>>(`/api/v1/admin/testimonials/${id}/enable`),
disableTestimonial: (id: number) =>
  apiClient.patch<ApiResponse<TestimonialResponse>>(`/api/v1/admin/testimonials/${id}/disable`),
deleteTestimonial: (id: number) =>
  apiClient.delete<ApiResponse<void>>(`/api/v1/admin/testimonials/${id}`),

  // ── Banners (Admin) ─────────────────────────────────────────
getBanners: () => apiClient.get<ApiResponse<BannerResponse[]>>('/api/v1/admin/banners'),

createBanner: (data: FormData) =>
  apiClient.post<ApiResponse<BannerResponse>>('/api/v1/admin/banners', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

// ✅ Update supports image replacement via FormData
updateBanner: (id: number, data: FormData) =>
  apiClient.patch<ApiResponse<BannerResponse>>(`/api/v1/admin/banners/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

deleteBanner: (id: number) =>
  apiClient.delete<ApiResponse<void>>(`/api/v1/admin/banners/${id}`),

enableBanner: (id: number) =>
  apiClient.patch<ApiResponse<BannerResponse>>(`/api/v1/admin/banners/${id}/enable`),

disableBanner: (id: number) =>
  apiClient.patch<ApiResponse<BannerResponse>>(`/api/v1/admin/banners/${id}/disable`),
  
  // ── Links (Admin) ─────────────────────────────────────────────
getLinks: (params?: { page?: number; size?: number; sortBy?: string; direction?: string }) =>
  apiClient.get<ApiResponse<PageResponse<LinkResponse>>>('/api/v1/admin/links', {
    params: { page: 0, size: 10, sortBy: 'createdAt', direction: 'DESC', ...params },
  }),

getLinkById: (id: number) =>
  apiClient.get<ApiResponse<LinkResponse>>(`/api/v1/admin/links/${id}`),

createLink: (data: FormData) =>
  apiClient.post<ApiResponse<LinkResponse>>('/api/v1/admin/links', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

updateLink: (id: number, data: FormData) =>
  apiClient.put<ApiResponse<LinkResponse>>(`/api/v1/admin/links/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

deleteLink: (id: number) =>
  apiClient.delete<ApiResponse<void>>(`/api/v1/admin/links/${id}`),
  // ── Web Links ──────────────────────────────────────────────
  getWebLinks: () => apiClient.get<ApiResponse<WebLinkResponse[]>>('/api/v1/public/web-links'),
// Inside adminApi object
createWebLink: (data: { name: string; url: string; type: string; isActive?: boolean }) =>
  apiClient.post<ApiResponse<WebLinkResponse>>('/api/v1/admin/web-links', data),

updateWebLink: (id: number, data: { name: string; url: string; type: string; isActive?: boolean }) =>
  apiClient.put<ApiResponse<WebLinkResponse>>(`/api/v1/admin/web-links/${id}`, data),

  deleteWebLink: (id: number) => apiClient.delete<ApiResponse<void>>(`/api/v1/admin/web-links/${id}`),

  // ── Settings ADMIN ───────────────────────────────────────────────
     getSettings: () =>
      apiClient.get<ApiResponse<SettingResponse>>('/api/v1/admin/settings'),

    getTechnicalIssueSetting: () =>
      apiClient.get<ApiResponse<TechnicalIssueHandleSettingResponse>>('/api/v1/admin/settings/technical-issue'),

    // Update with optional image upload (multipart/form-data)
    updateTechnicalIssueSetting: (data: FormData) =>
      apiClient.put<ApiResponse<TechnicalIssueHandleSettingResponse>>('/api/v1/admin/settings/technical-issue', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),


      updatePackageService: (packageId: number, mappingId: number, data: { highlighted?: boolean; displayOrder?: number }) =>
  apiClient.put<ApiResponse<PackageResponse>>(`/api/v1/admin/packages/${packageId}/services/${mappingId}`, data),


      reorderPackageServices: (packageId: number, data: Array<{ mappingId: number; displayOrder: number }>) =>
  apiClient.patch<ApiResponse<PackageResponse>>(`/api/v1/admin/packages/${packageId}/services/reorder`, data),


      // ── Notifications (Admin) ────────────────────────────────────
sendNotification: (data: FormData) =>
  apiClient.post<ApiResponse<void>>('/api/v1/admin/notifications/send', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

getNotifications: (page = 0, size = 10) =>
  apiClient.get<ApiResponse<PageResponse<NotificationResponse>>>('/api/v1/admin/notifications', {
    params: { page, size, sort: 'createdAt,desc' },
  }),

deleteNotification: (id: number) =>
  apiClient.delete<ApiResponse<void>>(`/api/v1/admin/notifications/${id}`),

resendNotification: (id: number) =>
  apiClient.post<ApiResponse<void>>(`/api/v1/admin/notifications/${id}/resend`),


};


// ─── Notifications (User) ────────────────────────────────────
export const notificationsApi = {
  getMyNotifications: (page = 0, size = 10) =>
    apiClient.get<ApiResponse<PageResponse<NotificationResponse>>>('/api/v1/notifications/me', {
      params: { page, size, sort: 'createdAt,desc' },
    }),
  getUnreadCount: () =>
    apiClient.get<ApiResponse<number>>('/api/v1/notifications/me/unread-count'),
  markAsRead: (id: number) =>
    apiClient.patch<ApiResponse<void>>(`/api/v1/notifications/${id}/mark-as-read`),
  markAllAsRead: () =>
    apiClient.patch<ApiResponse<void>>('/api/v1/notifications/me/read-all'),
  clearAll: () =>
    apiClient.delete<ApiResponse<void>>('/api/v1/notifications/me'),
  deleteOne: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/notifications/me/${id}`),
};

// ─── Booking / One-to-One Consultation ───────────────────────
export const bookingApi = {
  getAvailableSlots: (date: string) =>
    apiClient.get<ApiResponse<AvailableSlotResponse[]>>(
      '/api/v1/bookings/available-slots',
      { params: { date } }
    ),

  getConsultationSettings: () =>
    apiClient.get<ApiResponse<ConsultationSettingsResponse>>(
      '/api/v1/bookings/settings'
    ),

  createBooking: (data: CreateConsultationBookingRequest) =>
    apiClient.post<ApiResponse<ConsultationBookingResponse>>(
      '/api/v1/bookings',
      data
    ),

  getGuestBooking: (token: string) =>
    apiClient.get<ApiResponse<GuestBookingManagementResponse>>(
      '/api/v1/bookings/manage',
      { params: { token } }
    ),

  guestReschedule: (data: GuestRescheduleBookingRequest) =>
    apiClient.put<ApiResponse<GuestBookingManagementResponse>>(
      '/api/v1/bookings/manage/reschedule',
      data
    ),

  guestCancel: (data: GuestCancelBookingRequest) =>
    apiClient.patch<ApiResponse<GuestBookingManagementResponse>>(
      '/api/v1/bookings/manage/cancel',
      data
    ),
};


// ─── Admin Consultation Settings ─────────────────────────────
export const adminConsultationSettingsApi = {
  get: () =>
    apiClient.get<ApiResponse<ConsultationSettingsResponse>>(
      '/api/v1/admin/consultation-settings'
    ),

  update: (data: UpdateConsultationSettingsRequest) =>
    apiClient.put<ApiResponse<ConsultationSettingsResponse>>(
      '/api/v1/admin/consultation-settings',
      data
    ),
};

// ─── Admin Booking / Consultation ────────────────────────────
export const adminBookingApi = {
  getDashboard: () =>
    apiClient.get<ApiResponse<BookingDashboardResponse>>(
      '/api/v1/admin/bookings/dashboard'
    ),

  getBookings: (
    filters?: AdminBookingFilterRequest,
    params?: { page?: number; size?: number; sort?: string }
  ) =>
    apiClient.get<ApiResponse<PageResponse<ConsultationBookingSummaryResponse>>>(
      '/api/v1/admin/bookings',
      {
        params: {
          ...filters,
          ...params,
        },
      }
    ),

  getBookingById: (bookingId: string) =>
    apiClient.get<ApiResponse<BookingDetailsResponse>>(
      `/api/v1/admin/bookings/${encodeURIComponent(bookingId)}`
    ),

  approveBooking: (bookingId: string, data: BookingActionRequest) =>
    apiClient.patch<ApiResponse<BookingDetailsResponse>>(
      `/api/v1/admin/bookings/${encodeURIComponent(bookingId)}/approve`,
      data
    ),

  rescheduleBooking: (bookingId: string, data: BookingActionRequest) =>
    apiClient.patch<ApiResponse<BookingDetailsResponse>>(
      `/api/v1/admin/bookings/${encodeURIComponent(bookingId)}/reschedule`,
      data
    ),

  cancelBooking: (bookingId: string, data: BookingActionRequest) =>
    apiClient.patch<ApiResponse<BookingDetailsResponse>>(
      `/api/v1/admin/bookings/${encodeURIComponent(bookingId)}/cancel`,
      data
    ),

  completeBooking: (bookingId: string) =>
    apiClient.patch<ApiResponse<BookingDetailsResponse>>(
      `/api/v1/admin/bookings/${encodeURIComponent(bookingId)}/complete`
    ),

  noShowBooking: (bookingId: string) =>
    apiClient.patch<ApiResponse<BookingDetailsResponse>>(
      `/api/v1/admin/bookings/${encodeURIComponent(bookingId)}/no-show`
    ),

  deleteBooking: (bookingId: string) =>
    apiClient.delete<ApiResponse<string>>(
      `/api/v1/admin/bookings/${encodeURIComponent(bookingId)}`
    ),
};
