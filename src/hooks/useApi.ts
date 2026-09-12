import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  servicesApi, projectsApi, projectBundlesApi, packagesApi,
  technologiesApi, testimonialsApi, bannersApi, featuresApi,
  settingsApi, userApi, adminApi,authApi
} from '@/services/api';
import type { CreateAddressRequest,UpdateAddressRequest} from '@/types';
import { 
  ChangePhoneNumberRequest, 
  ChangePassworRequest,ChangePasswordResponse,
  AddressResponse,
} from '@/types';
import toast from 'react-hot-toast';
import { isTransientError } from '@/lib/apiClient';

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;


// ─── Query Keys ──────────────────────────────────────────────
export const queryKeys = {
  services:             ['services'] as const,
  service:              (slug: string) => ['services', slug] as const,
  projects:             (page?: number) => ['projects', page] as const,
  featuredProjects:     ['projects', 'featured'] as const,
  project:              (slug: string) => ['projects', slug] as const,
  bundles:              ['bundles'] as const,
  featuredBundles:      ['bundles', 'featured'] as const,
  bundle:               (slug: string) => ['bundles', slug] as const,
  packages:             ['packages'] as const,
  featuredPackages:     ['packages', 'featured'] as const,
  package:              (slug: string) => ['packages', slug] as const,
  technologies:         ['technologies'] as const,
  technology:           (slug: string) => ['technologies', slug] as const,
  testimonials:         (page?: number) => ['testimonials', page] as const,
  featuredTestimonials: ['testimonials', 'featured'] as const,
  banners:              ['banners'] as const,
  features:             ['features'] as const,
  settings:             ['settings'] as const,
  me:                   ['me'] as const,
  adminUsers:           (page?: number) => ['admin', 'users', page] as const,
  adminProjects:        (page?: number) => ['admin', 'projects', page] as const,
  adminBundles:         (page?: number) => ['admin', 'bundles', page] as const,
  adminServices:        (page?: number) => ['admin', 'services', page] as const,
  adminPackages:        (page?: number) => ['admin', 'packages', page] as const,
  adminTechnologies:    (page?: number) => ['admin', 'technologies', page] as const,
  adminTestimonials:    (page?: number) => ['admin', 'testimonials', page] as const,
  adminFeatures:        (page?: number) => ['admin', 'features', page] as const,
  adminLinks:           (page?: number) => ['admin', 'links', page] as const,
  adminWebLinks:        ['admin', 'web-links'] as const,
  adminBanners:         ['admin', 'banners'] as const,
  adminSettings:        ['admin', 'settings'] as const,
};


// Change phone number
export const useChangePhone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChangePhoneNumberRequest) => authApi.changePhone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Phone number updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update phone');
    },
  });
};

// Change password
// Change password – no phone needed
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
    onSuccess: () => toast.success('Password changed successfully'),
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    },
  });
};

// ─── Public Hooks ────────────────────────────────────────────
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => servicesApi.getAll().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useService(slug: string) {
  return useQuery({
    queryKey: queryKeys.service(slug),
    queryFn: () => servicesApi.getBySlug(slug).then((r) => r.data.data),
    enabled: !!slug,
  });
}

import type { ProjectResponse } from '@/types';

// Define what our hook returns
interface ProjectsQueryResult {
  content: ProjectResponse[];
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
}


interface ProjectsData {
  content: ProjectResponse[];
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
}

export function useProjects(page = 0, pageSize = 10) {
  return useQuery<ProjectsData>({
    queryKey: ['projects', page],
    queryFn: async () => {
      // Backend se raw response lete hain
      const res = await projectsApi.getAll();
      
      // ⚠️ YAHAN SAFE CASTING: backend array return karta hai, but TypeScript sochta hai PageResponse
      // Isliye pehle unknown, phir array
      const allProjects = (res.data.data as unknown) as ProjectResponse[];
      
      // Client-side pagination
      const start = page * pageSize;
      const end = start + pageSize;
      const paginated = allProjects.slice(start, end);
      const totalPages = Math.ceil(allProjects.length / pageSize);
      
      return {
        content: paginated,
        totalPages: totalPages,
        number: page,
        first: page === 0,
        last: page === totalPages - 1 || totalPages === 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}


export function useProject(slug: string) {
  return useQuery({
    queryKey: ['project', slug],
    queryFn: async () => {
      const res = await projectsApi.getBySlug(slug);
      return res.data.data;
    },
    enabled: !!slug,
  });
}
export function useFeaturedProjects() {
  return useQuery({
    queryKey: queryKeys.featuredProjects,
    queryFn: () => projectsApi.getFeatured().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedBundles() {
  return useQuery({
    queryKey: queryKeys.featuredBundles,
    queryFn: () => projectBundlesApi.getFeatured().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBundle(slug: string) {
  return useQuery({
    queryKey: queryKeys.bundle(slug),
    queryFn: () => projectBundlesApi.getBySlug(slug).then((r) => r.data.data),
    enabled: !!slug,
  });
}

export function usePackages() {
  return useQuery({
    queryKey: queryKeys.packages,
    queryFn: () => packagesApi.getAll().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedPackages() {
  return useQuery({
    queryKey: queryKeys.featuredPackages,
    queryFn: () => packagesApi.getFeatured().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePackage(slug: string) {
  return useQuery({
    queryKey: queryKeys.package(slug),
    queryFn: () => packagesApi.getBySlug(slug).then((r) => r.data.data),
    enabled: !!slug,
  });
}

export function useTechnologies() {
  return useQuery({
    queryKey: queryKeys.technologies,
    queryFn: () => technologiesApi.getAll().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTechnology(slug: string) {
  return useQuery({
    queryKey: queryKeys.technology(slug),
    queryFn: () => technologiesApi.getBySlug(slug).then((r) => r.data.data),
    enabled: !!slug,
  });
}

export function useTestimonials(page = 0, size = 12) {
  return useQuery({
    queryKey: queryKeys.testimonials(page),
    queryFn: async () => {
      const res = await testimonialsApi.getAll({ page, size });
      const data = res.data.data;
      return { ...data, number: data.page, first: data.page === 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedTestimonials() {
  return useQuery({
    queryKey: queryKeys.featuredTestimonials,
    queryFn: () => testimonialsApi.getFeatured().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBanners() {
  return useQuery({
    queryKey: queryKeys.banners,
    queryFn: () => bannersApi.getAll().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatures() {
  return useQuery({
    queryKey: queryKeys.features,
    queryFn: () => featuresApi.getAll().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.getPublic().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => userApi.getMe().then((r) => r.data.data),
    // Retry transient failures — connectivity blips AND backend 5xx errors
    // (a server hiccup or mid-deploy blip is not "not authenticated" any
    // more than being offline is). A real 401/403 from the backend is
    // never retried here; apiClient's interceptor already attempted a
    // token refresh before this error surfaces, so by the time useMe sees
    // a 401 it's a confirmed rejection, not something retrying will fix.
    retry: (failureCount, error) => (isTransientError(error) ? failureCount < 2 : false),
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

// ─── Public Mutations ────────────────────────────────────────
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fullName?: string }) => userApi.updateMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
// ─── Admin Hooks ─────────────────────────────────────────────
export function useAdminOffers() { return useQuery({ queryKey: ['admin','offers'], queryFn: () => adminApi.getOffers().then(r => r.data.data) }); }
export function useAdminSiteModules() { return useQuery({ queryKey: ['admin','site-modules'], queryFn: () => adminApi.getSiteModules().then(r => r.data.data) }); }

export function useAdminContacts(filters: { page?: number; size?: number; sortBy?: string; direction?: string; status?: string; source?: string; email?: string; assignedToId?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'contacts', filters],
    queryFn: () => adminApi.getContactRequests(filters).then((r) => r.data.data),
  });
}

export function useUpdateContactStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: import('@/types').LeadStatus }) =>
      adminApi.updateContactRequestStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contacts'] }),
  });
}

export function useAdminUsers(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'users', page, size],
    queryFn: () => adminApi.getUsers({ page, size }).then((r) => r.data.data),
  });
}


export function useAdminServices(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'services', page, size],
    queryFn: () => adminApi.getServices({ page, size }).then(r => r.data.data),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  });
}


export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deletePackage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'packages'] }),
  });
}

export function useAdminTechnologies(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'technologies', page, size],
    queryFn: () => adminApi.getTechnologies({ page, size }).then((r) => r.data.data),
  });
}


// in hooks/useApi.ts
export function useAdminFeatures(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'features', page, size],
    queryFn: () => adminApi.getFeatures({ page, size }).then((r) => r.data.data),
  });
}

export function useAdminLinks(page = 0, size = 10) {
  return useQuery({
    queryKey: queryKeys.adminLinks(page),
    queryFn: () => adminApi.getLinks({ page, size }).then((r) => r.data.data),
  });
}

export function useAdminWebLinks() {
  return useQuery({
    queryKey: queryKeys.adminWebLinks,
    queryFn: () => adminApi.getWebLinks().then((r) => r.data.data),
  });
}


export function useDeleteTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteTestimonial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'testimonials'] }),
  });
}

export function useAdminBanners() {
  return useQuery({
    queryKey: queryKeys.adminBanners,
    queryFn: () => adminApi.getBanners().then((r) => r.data.data),
  });
}

import type { SettingResponse, TechnicalIssueHandleSettingResponse } from '@/types';

export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.adminSettings,
    queryFn: () => adminApi.getSettings().then((r) => r.data.data),
  });
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => adminApi.updateTechnicalIssueSetting(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSettings });
      qc.invalidateQueries({ queryKey: queryKeys.settings }); // also public settings
    },
  });
}

// ─── Admin Mutations ─────────────────────────────────────────
export function useAdminBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, block }: { id: number; block: boolean }) =>
      block ? adminApi.blockUser(id) : adminApi.unblockUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'projects'] }),
  });
}

export function useDeleteTechnology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteTechnology(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'technologies'] }),
  });
}

export function useDeleteFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteFeature(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'features'] }),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteLink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'links'] }),
  });
}

export function useAdminBundles(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'bundles', page, size],
    queryFn: () => adminApi.getBundles({ page, size }).then(r => r.data.data),
  });
}

export function useAdminProjects(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'projects', page, size],
    queryFn: () => adminApi.getProjects({ page, size }).then(r => r.data.data),
  });
}

export function useAdminPackages(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'packages', page, size],
    queryFn: () => adminApi.getPackages({ page, size }).then(r => r.data.data),
  });
}

export function useAdminTestimonials(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'testimonials', page, size],
    queryFn: () => adminApi.getTestimonials({ page, size }).then(r => r.data.data),
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteBundle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'bundles'] }),
  });
}

import type { NotificationResponse } from '@/types';

// ─── Admin Notifications ─────────────────────────────────────
export function useAdminNotifications(page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'notifications', page, size],
    queryFn: () => adminApi.getNotifications(page, size).then(r => r.data.data),
  });
}

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => adminApi.sendNotification(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });
}

export function useResendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.resendNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });
}


// ============================================================
//  ADDRESS HOOKS (real backend)
// ============================================================

export const useAddresses = () => {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => userApi.getAddresses().then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
};

export const useAddAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAddressRequest) => userApi.addAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address added successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add address');
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAddressRequest }) =>
      userApi.updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update address');
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete address');
    },
  });
};

export const useSetDefaultAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to set default');
    },
  });
};

// ============================================================
//  PROFILE IMAGE HOOK
// ============================================================

export const useChangeProfileImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('imageFile', file);
      return userApi.changeProfileImage(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile image updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update image');
    },
  });
};

// hooks/useApi.ts
export const useAddPhone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { countryCode: string; phoneNumber: string; password: string }) =>
      userApi.addPhone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Phone number added successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add phone');
    },
  });
};