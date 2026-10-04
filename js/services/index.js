/** Single import point for every frontend API service. */
export { authService } from './auth.service.js';
export { userService } from './user.service.js';
export { roleService } from './role.service.js';
export { messageService } from './message.service.js';
export { applicationService } from './application.service.js';
export { settingService } from './setting.service.js';
export { mediaService } from './media.service.js';
export { dashboardService } from './dashboard.service.js';
export { searchService } from './search.service.js';
export {
  lessonService, newsService, eventService, galleryService,
  teacherService, calendarService, programService, testimonialService, contentServices,
} from './content.service.js';
export { createResourceService } from './resource.service.js';
