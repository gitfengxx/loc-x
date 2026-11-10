#import <Foundation/Foundation.h>
#import "GlobalSearch.h"
#import <math.h>
int main(int argc,const char **argv){@autoreleasepool{
 NSDictionary *valid=@{@"geometry":@{@"type":@"Point",@"coordinates":@[@(-73.9856589),@(40.7484421)]},@"properties":@{@"name":@"Empire State Building",@"city":@"New York",@"country":@"United States"}};
 NSDictionary *bad=@{@"geometry":@{@"type":@"Point",@"coordinates":@[@181,@91]},@"properties":@{}};
 NSArray *results=WLOCGlobalSearchResults(@{@"features":@[[NSNull null],@{},bad,valid]});
 NSCAssert(results.count==1,@"reject malformed features and out-of-range coordinates");NSDictionary *r=results[0];
 NSCAssert(fabs([r[@"latitude"]doubleValue]-40.7484421)<1e-8&&fabs([r[@"longitude"]doubleValue]+73.9856589)<1e-8,@"GeoJSON lon/lat must map to unshifted WGS84 lat/lon");
 NSCAssert([r[@"title"]isEqual:@"Empire State Building"]&&[r[@"subtitle"]containsString:@"United States"],@"result title and country");
 NSCAssert(WLOCGlobalSearchResults(@[]).count==0&&WLOCGlobalSearchResults(@{@"features":@42}).count==0,@"invalid response shape");
 NSMutableArray *many=[NSMutableArray array];for(int i=0;i<10;i++)[many addObject:valid];NSCAssert(WLOCGlobalSearchResults(@{@"features":many}).count==8,@"result limit");
 puts("PASS global search parsing: malformed results, WGS84 coordinate order, title/country, result limit");
 if(argc>1&&strcmp(argv[1],"--live")==0){
  WLOCGlobalSearch *client=[WLOCGlobalSearch new];__block BOOL done=NO,ok=NO,cancelledCalled=NO;
  [client search:@"cancelled request" completion:^(NSArray *items,NSError *error){cancelledCalled=YES;}];[client cancel];
  [client search:@"Empire State Building, New York" completion:^(NSArray *items,NSError *error){
   for(NSDictionary *item in items)if([item[@"title"]isEqual:@"Empire State Building"]&&fabs([item[@"latitude"]doubleValue]-40.7484)<.01&&fabs([item[@"longitude"]doubleValue]+73.9857)<.01)ok=YES;
   if(error)NSLog(@"Live request failed: %@",error);done=YES;
  }];
  NSDate *deadline=[NSDate dateWithTimeIntervalSinceNow:25];while(!done&&deadline.timeIntervalSinceNow>0)[NSRunLoop.currentRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:.05]];
  [client cancel];if(!done||!ok||cancelledCalled){fprintf(stderr,"FAIL live global search must find Empire State Building in New York\n");return 1;}puts("PASS real global search client: Empire State Building in New York; cancelled pending request suppressed");
 }
}}
