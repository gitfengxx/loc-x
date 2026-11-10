#import "GlobalSearch.h"
#import <math.h>
NSArray<NSDictionary *> *WLOCGlobalSearchResults(id json){
 if(![json isKindOfClass:NSDictionary.class]||![json[@"features"]isKindOfClass:NSArray.class])return @[];
 NSMutableArray *items=[NSMutableArray array];
 for(id feature in json[@"features"]){
  if(![feature isKindOfClass:NSDictionary.class])continue;
  id geometry=feature[@"geometry"],p=feature[@"properties"];
  if(![geometry isKindOfClass:NSDictionary.class]||![p isKindOfClass:NSDictionary.class]||![geometry[@"type"]isEqual:@"Point"])continue;
  id c=geometry[@"coordinates"];if(![c isKindOfClass:NSArray.class]||[c count]<2||![c[0]isKindOfClass:NSNumber.class]||![c[1]isKindOfClass:NSNumber.class])continue;
  double lon=[c[0]doubleValue],lat=[c[1]doubleValue];if(!isfinite(lon)||!isfinite(lat)||fabs(lon)>180||fabs(lat)>90)continue;
  NSMutableArray *parts=[NSMutableArray array];for(NSString *key in @[@"housenumber",@"street",@"city",@"state",@"country"]){id s=p[key];if([s isKindOfClass:NSString.class]&&[s length]&&![parts containsObject:s])[parts addObject:s];}
  NSString *address=[parts componentsJoinedByString:@", "],*name=[p[@"name"]isKindOfClass:NSString.class]?p[@"name"]:@"";
  [items addObject:@{@"title":name.length?name:(address.length?address:@"地点"),@"subtitle":address,@"latitude":@(lat),@"longitude":@(lon)}];if(items.count==8)break;
 }
 return items;
}
@interface WLOCGlobalSearch ()
@property NSURLSession *session;
@property NSURLSessionDataTask *task;
@property NSCache *cache;
@property NSUInteger generation;
@property NSTimeInterval lastRequest;
@end
@implementation WLOCGlobalSearch
- (instancetype)init{if((self=[super init])){NSURLSessionConfiguration *c=NSURLSessionConfiguration.ephemeralSessionConfiguration;c.timeoutIntervalForRequest=15;c.timeoutIntervalForResource=20;c.HTTPAdditionalHeaders=@{@"User-Agent":[NSString stringWithFormat:@"loc-x/%@ (+https://github.com/gitfengxx/loc-x)",[NSBundle.mainBundle objectForInfoDictionaryKey:@"CFBundleShortVersionString"]?:@"test"]};_session=[NSURLSession sessionWithConfiguration:c];_cache=[NSCache new];_cache.countLimit=32;}return self;}
- (void)cancel{self.generation++;[self.task cancel];self.task=nil;}
- (void)search:(NSString *)query completion:(void (^)(NSArray<NSDictionary *> *,NSError *))completion{
 [self cancel];NSUInteger generation=self.generation;NSString *q=[query stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
 NSArray *cached=[self.cache objectForKey:q];if(cached){completion(cached,nil);return;}
 // Keep public demo service traffic modest, including repeated keyboard submits.
 NSTimeInterval delay=MAX(0,self.lastRequest+1-NSProcessInfo.processInfo.systemUptime);
 dispatch_after(dispatch_time(DISPATCH_TIME_NOW,(int64_t)(delay*NSEC_PER_SEC)),dispatch_get_main_queue(),^{
  if(generation!=self.generation)return;
  NSURLComponents *url=[NSURLComponents componentsWithString:@"https://photon.komoot.io/api/"];url.queryItems=@[[NSURLQueryItem queryItemWithName:@"q" value:q],[NSURLQueryItem queryItemWithName:@"limit" value:@"8"]];
  self.lastRequest=NSProcessInfo.processInfo.systemUptime;
  self.task=[self.session dataTaskWithURL:url.URL completionHandler:^(NSData *data,NSURLResponse *response,NSError *error){
   NSError *failure=error;NSInteger status=[(NSHTTPURLResponse *)response statusCode];id json=nil;
   if(!failure&&status!=200)failure=[NSError errorWithDomain:@"Global Search HTTP" code:status userInfo:nil];
   if(!failure){json=[NSJSONSerialization JSONObjectWithData:data?:NSData.data options:0 error:&failure];if(!failure&&(![json isKindOfClass:NSDictionary.class]||![json[@"features"]isKindOfClass:NSArray.class]))failure=[NSError errorWithDomain:@"Global Search" code:422 userInfo:@{NSLocalizedDescriptionKey:@"搜索服务返回了无效数据"}];}
   NSArray *items=failure?@[]:WLOCGlobalSearchResults(json);
   dispatch_async(dispatch_get_main_queue(),^{if(generation!=self.generation)return;self.task=nil;if(!failure)[self.cache setObject:items forKey:q];completion(items,failure);});
  }];[self.task resume];
 });
}
- (void)dealloc{[_session invalidateAndCancel];}
@end
