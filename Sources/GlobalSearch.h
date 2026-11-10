#import <Foundation/Foundation.h>
// Photon returns GeoJSON points in WGS84 order: longitude, latitude.
NSArray<NSDictionary *> *WLOCGlobalSearchResults(id json);
@interface WLOCGlobalSearch : NSObject
- (void)search:(NSString *)query completion:(void (^)(NSArray<NSDictionary *> *,NSError *))completion;
- (void)cancel;
@end
