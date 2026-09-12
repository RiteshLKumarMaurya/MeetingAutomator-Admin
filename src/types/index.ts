// ============================================================
// API Response Wrapper
// ============================================================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  page: number;
  last: boolean;
  first?: boolean;
  number?: number;
}

// ============================================================
// Media
// ============================================================
export interface MediaResponse {
  publicId: string;
  originalKey: string;
  optimizedKey: string;
  thumbKey: string;
  width: number;
  height: number;
}

// ============================================================
// Auth
// ============================================================
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

export interface AuthResponse {
  user: UserProfileResponse;
  tokens: TokenResponse;
}

export interface PhonePasswordLoginResponse {
  userProfileResponse: UserProfileResponse;
  tokenResponse: TokenResponse;
}

export interface PhonePasswordRegisterResponse {
  userProfileResponse: UserProfileResponse;
  tokenResponse: TokenResponse;
}

export interface GoogleLoginRequest {
  idToken: string;
  fcmToken?: string;
  device?: string;
}

export interface LoginRequest {
  fullPhoneNumber: string;
  password: string;
  fcmToken?: string;
  device?: string;
}

export interface PhonePasswordRegisterRequest {
  fullName: string;
  phoneNumber: string;
  countryCode: string;
  password: string;
  roleName: string;
  fcmToken?: string;
  device?: string;
}

export interface RefreshRequest { refreshToken: string; }
export interface LogoutRequest { deviceToken?: string; }

// ============================================================
// Roles
// ============================================================
export type RoleName = 'ROLE_ADMIN' | 'ROLE_CLIENT';

export interface RoleResponse {
  id: number;
  name: RoleName;
}

export interface RoleRequest {
  name: RoleName;
}

// ============================================================
// User
// ============================================================
export interface TechnicalIssueHandleSettingResponse {
  title: string;
  description: string;
  waitFrom: string;
  waitUntil: string | null;
  image: MediaResponse | null;
}

export interface SettingResponse {
  technicalIssueSetting: TechnicalIssueHandleSettingResponse;
}

// ============================================================
// Settings
// ============================================================
// For update request (matches backend UpdateTechnicalIssueSettingRequest)
export interface UpdateTechnicalIssueSettingRequest {
  title?: string;
  description?: string;
  waitFrom?: string;
  waitUntil?: string | null;
  imageFile?: File; // optional, for upload
}

// ============================================================
// Services
// ============================================================
export interface ServiceFeatureResponse {
  id: number;
  feature: FeatureResponse;
  displayOrder: number;
  highlighted: boolean;
}

export interface ServiceResponse {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  iconImage: MediaResponse | null;
  serviceLinks: ServiceLinkResponse[];
  displayOrder: number;
  featured: boolean;
  active: boolean;
  features: ServiceFeatureResponse[];
  technologies: ServiceTechnologyResponse[];
  createdAt: string;
  updatedAt: string;
}


// ============================================================
// Projects
// ============================================================
export interface ProjectBundleSummaryResponse {
  projectBundleId: number;
  projectBundleName: string;
  projectBundleSlug: string;
}

export interface ProjectBannerImageResponse {
  id: number;
  media: MediaResponse;
  displayOrder: number;
}

export interface ProjectTechnologyResponse {
  id: number;
  technology: TechnologyResponse;
  displayOrder: number;
}

// Mirrors ProjectTechnologyResponse — this is the join-row wrapper that
// exposes its own `id` (the mapping id), which is what the dedicated
// add/remove/reorder endpoints need. Previously this field was typed as
// plain LinkResponse[], which had no mapping id to remove/reorder by.
export interface ProjectExternalLinkResponse {
  id: number;
  link: LinkResponse;
  displayOrder: number;
}

export interface ProjectResponse {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  thumbImage: MediaResponse | null;
  bannerImages: ProjectBannerImageResponse[];   // ✅ changed from MediaResponse[]
  externalLinks: ProjectExternalLinkResponse[]; // ✅ changed from LinkResponse[]
  featured: boolean;
  active: boolean;
  technologies: ProjectTechnologyResponse[];    // ✅ changed from TechnologyResponse[]
  createdAt: string;
  updatedAt: string;
  projectBundle: ProjectBundleSummaryResponse | null;
  projectDeliverableType: string;
}

export interface ProjectBundleResponse {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  featured: boolean;
  active: boolean;
  thumbImage: MediaResponse | null;
  projects: ProjectResponse[];
  packageEntity: PackageResponse | null;
  testimonial: TestimonialResponse | null;
  createdAt: string;    // ISO datetime
  updatedAt: string;    // ISO datetime
}

// Project deliverable types
export type ProjectDeliverableType =
  | 'WEBSITE'
  | 'ANDROID_APP'
  | 'IOS_APP'
  | 'ADMIN_PANEL'
  | 'BACKEND_API'
  | 'DELIVERY_APP'
  | 'INVENTORY_SYSTEM'
  | 'FULL_ECOSYSTEM';

// ── Project ↔ Technology / Link association requests ────────────
// Used by the dedicated add endpoints:
//   POST /admin/projects/{id}/technologies
//   POST /admin/projects/{id}/links
export interface AddProjectTechnologyRequest {
  technologyId: number;
  displayOrder: number;
}

export interface AddProjectLinkRequest {
  linkId: number;
  displayOrder: number;
}

// Used by the dedicated reorder endpoints (same shape for both):
//   PATCH /admin/projects/{id}/technologies/reorder
//   PATCH /admin/projects/{id}/links/reorder
export interface ReorderAssociationItem {
  mappingId: number;
  displayOrder: number;
}


// ============================================================
// Technologies
// ============================================================


export interface TechnologyResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconImage: MediaResponse | null;
  links: TechnologyLinkResponse[];   // ✅ not LinkResponse[]
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Testimonials
// ============================================================
export type DesignationType = 'CEO' | 'FOUNDER' | 'MANAGER' | 'EMPLOYEE' | 'PRESIDENT';


export interface TestimonialBannerImageResponse {
  id: number;
  media: MediaResponse;
  displayOrder: number;
}

export interface TestimonialLinkResponse {
  id: number;
  link: LinkResponse;
  displayOrder: number;
}

export interface TestimonialResponse {
  id: number;
  clientName: string;
  companyName: string;
  designationType: string;
  review: string;
  rating: number;
  thumbImage: MediaResponse | null;
  bannerImages: TestimonialBannerImageResponse[];   // ✅ changed
  links: TestimonialLinkResponse[];
  featured: boolean;
  active: boolean;
  clientId: number;
  createdAt: string;
  updatedAt: string;
}


// ============================================================
// Features & Links
// ============================================================
export interface FeatureResponse {
  id: number;
  name: string;
  description: string;
  iconImage: MediaResponse | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Links
// ============================================================
export type LinkType =
  | 'WEBSITE'
  | 'LANDING_PAGE'
  | 'PLAY_STORE'
  | 'APP_STORE'
  | 'ADMIN_PANEL'
  | 'DELIVERY_APP'
  | 'GITHUB'
  | 'YOUTUBE'
  | 'FIGMA'
  | 'DOCUMENTATION'
  | 'OTHER';
export interface LinkResponse {
  id: number;
  name: string;
  description: string;
  url: string;
  linkType: LinkType;
  iconImage: MediaResponse | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Web Links
// ============================================================
export type WebLinkType =
  | 'PRIVACY_POLICY'
  | 'TERMS_CONDITIONS'
  | 'DELETE_ACCOUNT'
  | 'REFUND_POLICY'
  | 'SHIPPING_POLICY'
  | 'CANCELLATION_POLICY'
  | 'RETURN_POLICY'
  | 'ABOUT_US'
  | 'CONTACT_US'
  | 'FAQ'
  | 'SUPPORT'
  | 'USER_AGREEMENT'
  | 'COOKIE_POLICY'
  | 'LOYALTY_PROGRAM'
  | 'CAREERS';

export interface WebLinkResponse {
  id: number;
  name: string;
  url: string;
  type: WebLinkType;
  isActive: boolean;
}

///Banner
export type BannerType = 'PACKAGE' | 'SERVICE' | 'PROJECT' | 'URL' | 'TESTIMONIAL' | 'TECHNOLOGY';

export interface BannerResponse {
  id: number;
  bannerImage: MediaResponse | null;
  type: BannerType;
  referenceId: number | null;
  redirectUrl: string | null;
  active: boolean;
  startAt: string;
  endAt: string | null;
  priority: number;
  // 👇 New fields (v2)
  cta: string | null;
  heading: string | null;
  subHeading: string | null;
}


// ============================================================
// Offers & Site Modules
// ============================================================
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export interface OfferPackageResponse { id: number; name: string; slug: string; }
export interface OfferResponse {
  id: number; name: string; slug: string; heading: string | null; description: string | null;
  eligibility: string | null; discountType: DiscountType; discountValue: number; ctaText: string | null;
  startAt: string; endAt: string | null; active: boolean; featured: boolean; displayOrder: number;
  packages: OfferPackageResponse[]; createdAt: string; updatedAt: string;
}
export interface OfferRequest {
  name: string; slug?: string; heading?: string; description?: string; eligibility?: string;
  discountType: DiscountType; discountValue: number; ctaText?: string; startAt: string; endAt?: string;
  active: boolean; featured: boolean; displayOrder: number; packageIds: number[];
}
export interface SiteModuleResponse {
  id: number; moduleKey: string; name: string; description: string | null; active: boolean; displayOrder: number;
}

// ============================================================
// Users
// ============================================================

export interface UserSummaryResponse {
  id: number;
  email: string;
  phone: string;
  fullName: string;
  mediaProfile: MediaResponse | null;
  blocked: boolean;
  roleName: RoleName;
  createdAt?: string;   // optional, for frontend table
}

export interface UserProfileResponse {
  id: number;
  email: string;
  phone: string;
  fullName: string;
  mediaProfile: MediaResponse | null;
  blocked: boolean;
  roleName: RoleName;
  settings: SettingResponse;
  webLinks: WebLinkResponse[];
  addresses: AddressResponse[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Admin
// ============================================================
export interface AdminUserSummaryResponse {
  id: number;
  email: string;
  phone: string;
  fullName: string;
  blocked: boolean;
  roleName: string;
  createdAt: string;
}



  export interface ServiceResponse {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  iconImage: MediaResponse | null;
  serviceLinks: ServiceLinkResponse[];
  displayOrder: number;
  featured: boolean;
  active: boolean;
  features: ServiceFeatureResponse[];
  technologies: ServiceTechnologyResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceLinkResponse {
  id: number;
  link: LinkResponse;
  displayOrder: number;
}


export interface ServiceTechnologyResponse {
  id: number;
  technology: TechnologyResponse;
  displayOrder: number;
}

// ============================================================
// Packages
// ============================================================
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';


  //packages

export interface PackageServiceMapping {
  id: number;
  service: ServiceResponse;
  displayOrder: number;
  highlighted?: boolean;
}

export interface PackageServiceResponse {
  id: number;                     // mapping id
  serviceResponse: ServiceResponse;  // full service object
  displayOrder: number;
  highlighted: boolean;
}

export interface PackageResponse {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  currencyCode: CurrencyCode;
  iconImage: MediaResponse | null;
  featured: boolean;
  displayOrder: number;
  active: boolean;
  services: PackageServiceResponse[];
  createdAt: string;
  updatedAt: string;
}

// If you also need the request DTOs (for create/update), you can add:
export interface PackageServiceRequest {
  serviceId: number;
  displayOrder?: number;
  highlighted?: boolean;
}

// ============================================================
// Technologies
// ============================================================
export interface TechnologyLinkResponse {
  id: number;
  link: LinkResponse;
  displayOrder: number;
}

// ============================================================
// Notifications
// ============================================================
export type NotificationType = 'LEAD' | 'PROMOTION' | 'PAYMENT' | 'SYSTEM' | 'SECURITY';

export interface NotificationResponse {
  id: number;
  title: string;
  message: string;
  read: boolean;
  notificationType: NotificationType;
  redirectUrl: string;
  allDevices: boolean;
  media: MediaResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationRequest {
  title: string;
  message: string;
  notificationType: NotificationType;
  redirectUrl?: string;
  notificationImageFile?: File;
  sendToAll: boolean;
  sendToAllDevices: boolean;
  deviceToken?: string;
  userId?: number;
  userIds?: number[];
}

export type LeadSource = 'WEBSITE' | 'GOOGLE' | 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'REFERRAL' | 'WHATSAPP' | 'OTHER';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface ContactRequestResponse {
  id: number;
  name: string;
  email: string;
  countryCode?: string | null;
  phone?: string | null;
  companyName?: string | null;
  country?: string | null;
  status: LeadStatus;
  source: LeadSource;
  packageId?: number | null;
  packageName?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  message?: string | null;
  contactedAt?: string | null;
  closedAt?: string | null;
  notes?: string | null;
  assignedToId?: number | null;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  currencyCode?: CurrencyCode | null;
  businessModelType?: string | null;
  projectIdea?: string | null;
  sharePercentage?: number | null;
  partnershipAccepted?: boolean | null;
}

export interface ContactRequestSearchRequest {
  page: number;
  size: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC' | string;
  status?: LeadStatus;
  source?: LeadSource;
  email?: string;
  assignedToId?: number;
}


// ============================================================
// Missing Auth DTOs (from AuthController)
// ============================================================

// Request to change phone number
export interface ChangePhoneNumberRequest {
  currentFullPhoneNumber: string;  // with country code, e.g., "+919876543210"
  password: string;
  newFullPhoneNumber: string;
}

// Response after changing phone number
export interface ChangePhoneNumberResponse {
  phoneNumber: string;   // the new phone number
  message: string;
}

// Request to change password using phone number
export interface ChangePassworRequest {
  currentPassword: string;
  newPassword: string;
}

// Response after changing password
export interface ChangePasswordResponse {
  message: string;
}

// Response for refresh token endpoint
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ============================================================
// Profile Update Request (from UserController PATCH /me)
// ============================================================
export interface UpdateProfileRequestDto {
  fullName?: string;         // currently the only field allowed by backend
  // future fields: profileImageUrl, etc.
}
export type AddressType = 'HOME' | 'CLINIC' | 'BUSINESS' | 'BILLING' | 'OTHER';

export interface AddressResponse {
  id: number;
  addressType: AddressType;
  contactPersonName?: string;
  countryCode?: string;
  contactPhoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  stateName?: string;
  zipCode?: string;
  countryName?: string;
  landmark?: string;
  nearbyPlace?: string;
  directions?: string;
  displayName?: string;
  fullAddress?: string;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressRequest {
  addressType: AddressType;
  countryCode?: string;
  contactPersonName?: string;
  contactPhoneNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  stateName: string;
  zipCode: string;
  countryName?: string;
  landmark?: string;
  nearbyPlace?: string;
  directions?: string;
  displayName?: string;
  fullAddress?: string;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export type UpdateAddressRequest = Partial<CreateAddressRequest>;



// ============================================================
// Notification Related (if missing)
// ============================================================
// LogoutRequest already exists in your TS (under Auth)
// But ensure it matches the backend:
// backend expects { deviceToken: string } (optional)
// Your LogoutRequest is fine.

// ============================================================
// Google Login (already exists, but keep for completeness)
// ============================================================
// GoogleLoginRequest already present

// ============================================================
// Booking / Consultation
// ============================================================

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type BookingBusinessType =
  | 'ECOMMERCE_STORE_OWNER'
  | 'D2C_BRAND'
  | 'ECOMMERCE'
  | 'RETAIL_BUSINESS'
  | 'GROCERY'
  | 'SUPERMARKET'
  | 'WHOLESALER_DISTRIBUTOR'
  | 'MANUFACTURER'
  | 'STARTUP'
  | 'SAAS'
  | 'AGENCY'
  | 'CONSULTING'
  | 'COACHING'
  | 'SERVICE_BUSINESS'
  | 'OTHER';

export type BookingLeadSource =
  | 'WEBSITE'
  | 'GOOGLE'
  | 'LINKEDIN'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'REFERRAL'
  | 'WHATSAPP'
  | 'OTHER';

export interface AvailableSlotResponse {
  start: string;
  end: string;
  label: string;
  available: boolean;
  remainingCapacity: number;
}

export type BookingPlatform = 'MEETINGAUTOMATOR';

export interface CreateConsultationBookingRequest {
  name: string;
  email: string;
  whatsappNumber: string;
  companyName?: string;
  requestedAt: string;
  notes?: string;
  leadSource?: BookingLeadSource;
  businessType?: BookingBusinessType;

  /** Product/platform that owns this consultation booking. */
  platform?: BookingPlatform;
}

export interface ConsultationBookingResponse {
  bookingId: string;
  userId?: number | null;
  customerName: string;
  email: string;
  whatsappNumber: string;
  companyName?: string | null;
  requestedAt: string;
  scheduledAt?: string | null;
  status: BookingStatus;
  meetingLink?: string | null;
  calendarLink?: string | null;
  googleEventId?: string | null;
  cancelReason?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  businessType?: BookingBusinessType | null;
  leadSource?: BookingLeadSource | null;
}

export interface GuestBookingManagementResponse {
  bookingId: string;
  customerName: string;
  companyName?: string | null;
  scheduledAt: string;
  status: BookingStatus;
  meetingLink?: string | null;
  canReschedule: boolean;
  canCancel: boolean;
  reschedulesUsed: number;
  reschedulesRemaining: number;
  maxReschedulesPer24Hours: number;
  managementTokenExpiresAt?: string | null;
}

export interface GuestRescheduleBookingRequest {
  token: string;
  scheduledAt: string;
  notes?: string;
}

export interface GuestCancelBookingRequest {
  token: string;
  reason: string;
}


// ============================================================
// Admin Booking / Consultation
// ============================================================

export interface ConsultationBookingSummaryResponse {
  bookingId: string;
  name: string;
  email: string;
  whatsappNumber: string;
  companyName?: string | null;
  scheduledAt?: string | null;
  status: BookingStatus;
}

export interface BookingDashboardResponse {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  todayBookings: number;
}

export interface BookingDetailsResponse {
  bookingId: string;
  userId?: number | null;
  customerName: string;
  email: string;
  whatsappNumber: string;
  companyName?: string | null;
  leadSource?: LeadSource | null;
  status: BookingStatus;
  requestedAt?: string | null;
  scheduledAt?: string | null;
  meetingLink?: string | null;
  googleEventId?: string | null;
  calendarLink?: string | null;
  cancelReason?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminBookingFilterRequest {
  keyword?: string;
  statuses?: BookingStatus[];
  leadSources?: LeadSource[];
  fromDate?: string;
  toDate?: string;
}

export interface BookingActionRequest {
  scheduledAt?: string;
  meetingLink?: string;
  cancelReason?: string;
  notes?: string;
  releaseSlot?: boolean;
}

export interface ConsultationSettingsResponse {
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  slotCapacity: number;
  bufferMinutes: number;
  minimumAdvanceMinutes: number;
  maximumAdvanceDays: number;
  maxReschedulesPer24Hours: number;
  timezone: string;
  workingDays: Array<
    'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' |
    'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  >;
}

export interface UpdateConsultationSettingsRequest {
  enabled?: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  slotCapacity: number;
  bufferMinutes: number;
  minimumAdvanceMinutes: number;
  maximumAdvanceDays: number;
  maxReschedulesPer24Hours: number;
  timezone: string;
  workingDays: ConsultationSettingsResponse['workingDays'];
}
