import type { Service } from '../../../client/interfaces/Service';
import { unique } from '../../../utils/unique';
import type { OpenApi } from '../interfaces/OpenApi';
import { getOperation } from './getOperation';
import { getOperationParameters } from './getOperationParameters';

/**
 * Get the OpenAPI services
 */
export function getServices(openApi: OpenApi): Service[] {
    const services = new Map<string, Service>();
    const tagGroups: string[] | undefined = openApi['x-tagGroups'] && openApi['x-tagGroups'][0]?.tags;

    for (const url in openApi.paths) {
        if (openApi.paths.hasOwnProperty(url)) {
            // Grab path and parse any global path parameters
            const path = openApi.paths[url];
            const pathParams = getOperationParameters(openApi, path.parameters || []);

            // Parse all the methods for this path
            for (const method in path) {
                if (path.hasOwnProperty(method)) {
                    switch (method) {
                        case 'get':
                        case 'put':
                        case 'post':
                        case 'delete':
                        case 'options':
                        case 'head':
                        case 'patch':
                            // Each method contains an OpenAPI operation, we parse the operation
                            const op = path[method]!;
                            let tags = op.tags?.filter(unique) || ['Service'];

                            //Remove Tags that are not in the x-tagGroups Extension
                            if (tagGroups) {
                                tags = tags.filter(tag => tagGroups.includes(tag));
                            }

                            tags.forEach(tag => {
                                const operation = getOperation(openApi, url, method, tag, op, pathParams);

                                // If we have already declared a service, then we should fetch that and
                                // append the new method to it. Otherwise we should create a new service object.
                                const service: Service = services.get(operation.service) || {
                                    name: operation.service,
                                    operations: [],
                                    imports: [],
                                };

                                // Push the operation in the service
                                service.operations.push(operation);
                                service.imports.push(...operation.imports);
                                services.set(operation.service, service);
                            });
                            break;
                    }
                }
            }
        }
    }
    return Array.from(services.values());
}
